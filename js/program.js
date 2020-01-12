import {generateUnusedKey} from './utils/objects.js'
import {TwoPriorityQueue} from './utils/queue.js'
import {BoxIndex} from './boxes/index.js'

function qualifiedPlugName(boxId, dir, plugName) {
  if (dir === 'in') {
    return `${plugName}->[${boxId}]`
  } else if (dir === 'out') {
    return `[${boxId}]->${plugName}`
  }
  throw new Error(`invalid plug direction ${dir}`)
}

class BoxWithMetadata {
  constructor (box, x = 0, y = 0) {
    this.object = box
    this.x = x
    this.y = y
  }
}

export class APGProgram {
  constructor () {
    this._apg = null
    this._boxes = new Map()
    this._wires = new Map()
    this._wiresByPlug = {}

    this._workQueue = new TwoPriorityQueue()
    this._workHappening = false
  }

  attachToUi (apg) {
    this._apg = apg
  }

  generateBoxId (box) {
    return generateUnusedKey(this._boxes, box.constructor.metadata().name)
  }

  generateWireId () {
    return generateUnusedKey(this._wires, 'wire')
  }

  addBox (box, id = null, x = 0, y = 0) {
    id = id || this.generateBoxId(box)

    if (this._boxes.has(id)) {
      throw new Error(`cannot add box with duplicate id ${id}`)
    }

    this._boxes.set(id, new BoxWithMetadata(box, x, y))

    // create entries in this._wiresByPlug for each plug
    let allPlugs = (
      box._inputOrder.map(x => ['in', x])
      .concat(box._outputOrder.map(x => ['out', x]))
    )
    for (let [dir, plugName] of allPlugs) {
      let fullName = qualifiedPlugName(id, dir, plugName)
      this._wiresByPlug[fullName] = new Set()
    }

    box.attachToProgram(this, id)

    this.scheduleProgramRefresh()
    this.scheduleBoxRefresh(id)

    return id
  }

  deleteBox (id) {
    if (!this._boxes.has(id)) {
      throw new Error(`no box with id ${id} found`)
    }

    let box = this._boxes.get(id).object

    // remove all wires
    let allPlugs = (
      box._inputOrder.map(x => ['in', x])
      .concat(box._outputOrder.map(x => ['out', x]))
    )
    for (let [dir, plugName] of allPlugs) {
      let fullName = qualifiedPlugName(id, dir, plugName)
      this._wiresByPlug[fullName].forEach(x => this.deleteWire(x))
    }

    this._boxes.delete(id)

    // TODO: each call to deleteWire also scheduled a refresh,
    // any way to dedup?
    this.scheduleProgramRefresh()
  }

  getBox (id) {
    if (!this._boxes.has(id)) {
      throw new Error(`no box with id ${id} found`)
    }

    return this._boxes.get(id).object
  }

  addWire (srcBox, srcPlug, destBox, destPlug, id = null) {
    if (!this._boxes.has(srcBox)) {
      throw new Error(`source box ${srcBox} does not exist`)
    }
    if (!this._boxes.get(srcBox).object.output.hasOwnProperty(srcPlug)) {
      throw new Error(`source box ${srcBox} does not have an output plug ${srcPlug}`)
    }
    if (!this._boxes.has(destBox)) {
      throw new Error(`destination box ${destBox} does not exist`)
    }
    if (!this._boxes.get(destBox).object.input.hasOwnProperty(destPlug)) {
      throw new Error(`destination box ${destBox} does not have an input plug ${destPlug}`)
    }

    id = id || this.generateWireId()

    if (this._wires.has(id)) {
      throw new Error(`cannot add wire with duplicate id ${id}`)
    }

    this._wires.set(id, {srcBox, srcPlug, destBox, destPlug})

    let srcPlugFullName = qualifiedPlugName(srcBox, 'out', srcPlug)
    this._wiresByPlug[srcPlugFullName].add(id)

    let destPlugFullName = qualifiedPlugName(destBox, 'in', destPlug)
    this._wiresByPlug[destPlugFullName].add(id)

    this.scheduleProgramRefresh()

    // update dest value if src value not null
    let srcPlugObj = this._boxes.get(srcBox).object.output[srcPlug]
    if (srcPlugObj._value !== null) {
      this.schedulePlugUpdate(destBox, destPlug, srcPlugObj._value)
    }

    return id
  }

  deleteWire (id) {
    if (!this._wires.has(id)) {
      throw new Error(`no wire with id ${id} found`)
    }

    let wire = this._wires.get(id)
    let srcPlugFullName = qualifiedPlugName(wire.srcBox, 'out', wire.srcPlug)
    this._wiresByPlug[srcPlugFullName].delete(id)

    let destPlugFullName = qualifiedPlugName(wire.destBox, 'in', wire.destPlug)
    this._wiresByPlug[destPlugFullName].delete(id)

    this._wires.delete(id)

    this.scheduleProgramRefresh()
  }

  scheduleProcessing (boxId, f) {
    this._workQueue.pushRegular(async yieldControl => {
      if (this._boxes.get(boxId).object._isProcessing) {
        throw new Error('trying to enter processing mode on box already in it')
      }
      this._boxes.get(boxId).object._isProcessing = true
      this._apg && this._apg.startBoxProcessing(boxId)

      var error = null
      try {
        // processing functions might return a Promise. if so, we
        // consider processing to last until that function returns.
        // it is okay to await on non-Promise values: in that case
        // the await completes immediately. so processing functions
        // can also be simple synchronous functions.
        await f(yieldControl)
      } catch (e) {
        console.error('caught error while processing box', boxId, e)
        error = e
      } finally {
        this._boxes.get(boxId).object._isProcessing = false
        this.scheduleBoxRefresh(boxId)
        this._apg && this._apg.finishBoxProcessing(boxId, error)
      }
    })
    this.performWork()
  }

  scheduleProgramRefresh () {
    if (!this._apg) {
      return
    }
    this._workQueue.pushPrioritized(() => this._apg.refreshProgramStructure())
    this.performWork()
  }

  scheduleBoxRefresh (boxId) {
    if (!this._apg) {
      return
    }
    this._workQueue.pushPrioritized(() => this._apg.refreshBox(boxId))
    this.performWork()
  }

  schedulePlugUpdate (boxId, plugName, value) {
    this.scheduleProcessing(
      boxId,
      (yieldControl) => this._boxes.get(boxId).object.input[plugName]._write(value, yieldControl)
    )
  }

  schedulePlugUpdatesFrom (boxId, plugName, value) {
    let plugFullName = qualifiedPlugName(boxId, 'out', plugName)

    for (let [_, wire] of this._wiresByPlug[plugFullName].entries()) {
      let {destBox, destPlug} = this._wires.get(wire)
      this.schedulePlugUpdate(destBox, destPlug, value)
      this._apg && this._apg.flashWireActivity(wire)
    }
  }

  async performWork () {
    if (this._workHappening) {
      return
    }

    let yieldControl = () => {
      // when a box yields control, we try to do a quick UI job.
      // for this to work well, UI jobs *must* actually be quick.
      if (this._workQueue.hasPrioritizedJobs()) {
        let job = this._workQueue.pop()
        try {
          job(() => null)
        } catch (e) {
          console.error('uncaught error in work queue', e)
        }
      }
      // regardless of what happens, we also set a zero-duration
      // timeout, which lets the browser do repaints and stuff
      // and keeps the UI responsive.
      return new Promise(resolve => setTimeout(resolve, 0))
    }

    this._workHappening = true
    while (!this._workQueue.empty()) {
      let job = this._workQueue.pop()

      try {
        await job(yieldControl)
      } catch (e) {
        console.error('uncaught error in work queue', e)
      }
    }
    this._workHappening = false
  }

  save () {
    let serialized = {}
    serialized.boxes = []
    for (let [id, box] of this._boxes.entries()) {
      serialized.boxes.push({id: id, x: box.x, y: box.y, type: box.object.constructor._typeId()})
    }
    serialized.wires = Array.from(
      this._wires.entries(),
      ([id, wire]) => ({id, ...wire})
    )
    return JSON.stringify(serialized)
  }

  static load (string) {
    let {boxes, wires} = JSON.parse(string)
    let program = new APGProgram()
    for (let {id, x, y, type} of boxes) {
      let boxType = BoxIndex.get(type)
      program.addBox(new boxType(), id, x, y)
    }
    for (let {id, srcBox, srcPlug, destBox, destPlug} of wires) {
      program.addWire(srcBox, srcPlug, destBox, destPlug)
    }
    return program
  }
}
