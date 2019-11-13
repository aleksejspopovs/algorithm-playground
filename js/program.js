import {generateUnusedKey} from './utils/objects.js'
import {TwoPriorityQueue} from './utils/queue.js'

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
  constructor (apg) {
    this._apg = apg
    this._boxes = {}
    this._wires = {}
    this._wiresByPlug = {}

    this._workQueue = new TwoPriorityQueue()
    this._workHappening = false
  }

  generateBoxId () {
    return generateUnusedKey(this._boxes, 'box')
  }

  generateWireId () {
    return generateUnusedKey(this._wires, 'wire')
  }

  addBox (box, id = null, x = 0, y = 0) {
    id = id || this.generateBoxId()

    if (this._boxes.hasOwnProperty(id)) {
      throw new Error(`cannot add box with duplicate id ${id}`)
    }

    this._boxes[id] = new BoxWithMetadata(box, x, y)
    box.attachToProgram(this, id)

    this.scheduleProgramRefresh()
    this.scheduleBoxRefresh(id)

    return id
  }

  deleteBox (id) {
    if (!this._boxes.hasOwnProperty(id)) {
      throw new Error(`no box with id ${id} found`)
    }

    let box = this._boxes[id].object

    // remove all wires
    let allPlugs = (
      box._inputOrder.map(x => ['in', x])
      .concat(box._outputOrder.map(x => ['out', x]))
    )
    for (let [dir, plugName] of allPlugs) {
      let fullName = qualifiedPlugName(id, dir, plugName)
      if (!this._wiresByPlug.hasOwnProperty(fullName)) {
        continue
      }

      this._wiresByPlug[fullName].forEach(x => this.deleteWire(x))
    }

    // we might leave behind some entries in this._wiresByPlug
    // corresponding to plugs of the deleted box, but that's
    // okay because they are empty.

    delete this._boxes[id]

    // TODO: each call to deleteWire also scheduled a refresh,
    // any way to dedup?
    this.scheduleProgramRefresh()
  }

  addWire (srcBox, srcPlug, destBox, destPlug, id = null) {
    if (!this._boxes.hasOwnProperty(srcBox)) {
      throw new Error(`source box ${srcBox} does not exist`)
    }
    if (!this._boxes[srcBox].object.output.hasOwnProperty(srcPlug)) {
      throw new Error(`source box ${srcBox} does not have an output plug ${srcPlug}`)
    }
    if (!this._boxes.hasOwnProperty(destBox)) {
      throw new Error(`destination box ${destBox} does not exist`)
    }
    if (!this._boxes[destBox].object.input.hasOwnProperty(destPlug)) {
      throw new Error(`destination box ${destBox} does not have an input plug ${destPlug}`)
    }

    id = id || this.generateWireId()

    if (this._wires.hasOwnProperty(id)) {
      throw new Error(`cannot add wire with duplicate id ${id}`)
    }

    this._wires[id] = {srcBox, srcPlug, destBox, destPlug}

    let srcPlugFullName = qualifiedPlugName(srcBox, 'out', srcPlug)
    // TODO: just create these when registering the box instead
    if (!this._wiresByPlug.hasOwnProperty(srcPlugFullName)) {
      this._wiresByPlug[srcPlugFullName] = new Set()
    }
    this._wiresByPlug[srcPlugFullName].add(id)

    let destPlugFullName = qualifiedPlugName(destBox, 'in', destPlug)
    if (!this._wiresByPlug.hasOwnProperty(destPlugFullName)) {
      this._wiresByPlug[destPlugFullName] = new Set()
    }
    this._wiresByPlug[destPlugFullName].add(id)

    // update dest value if src value not null
    let srcPlugObj = this._boxes[srcBox].object.output[srcPlug]
    if (srcPlugObj._value !== null) {
      this.schedulePlugUpdate(destBox, destPlug, srcPlugObj._value)
    }

    this.scheduleProgramRefresh()

    return id
  }

  deleteWire (id) {
    if (!this._wires.hasOwnProperty(id)) {
      throw new Error(`no wire with id ${id} found`)
    }

    let wire = this._wires[id]
    let srcPlugFullName = qualifiedPlugName(wire.srcBox, 'out', wire.srcPlug)
    this._wiresByPlug[srcPlugFullName].delete(id)

    let destPlugFullName = qualifiedPlugName(wire.destBox, 'in', wire.destPlug)
    this._wiresByPlug[destPlugFullName].delete(id)

    delete this._wires[id]

    this.scheduleProgramRefresh()
  }

  scheduleProcessing (boxId, f) {
    this._workQueue.pushRegular(() => {
      if (this._boxes[boxId].object._isProcessing) {
        throw new Error('trying to enter processing mode on box already in it')
      }
      this._boxes[boxId].object._isProcessing = true
      try {
        f()
      } finally {
        this._boxes[boxId].object._isProcessing = false
        this.scheduleBoxRefresh(boxId)
      }
    })
    this.performWork()
  }

  scheduleProgramRefresh () {
    this._workQueue.pushPrioritized(() => this._apg.refreshProgram())
    this.performWork()
  }

  scheduleBoxRefresh (boxId) {
    this._workQueue.pushPrioritized(() => this._apg.refreshBox(boxId))
    this.performWork()
  }

  schedulePlugUpdate (boxId, plugName, value) {
    this.scheduleProcessing(
      boxId,
      () => this._boxes[boxId].object.input[plugName]._write(value)
    )
  }

  schedulePlugUpdatesFrom (boxId, plugName, value) {
    let plugFullName = qualifiedPlugName(boxId, 'out', plugName)
    if (!this._wiresByPlug.hasOwnProperty(plugFullName)) {
      return
    }

    for (let [_, wire] of this._wiresByPlug[plugFullName].entries()) {
      let {destBox, destPlug} = this._wires[wire]
      this.schedulePlugUpdate(destBox, destPlug, value)
    }
  }

  performWork() {
    if (this._workHappening) {
      return
    }

    this._workHappening = true
    console.log('starting processing loop')
    while (!this._workQueue.empty()) {
      // TODO: handle exceptions
      let pendingOp = this._workQueue.pop()
      console.log(`executing ${pendingOp}`)
      try {
        pendingOp()
      } catch (e) {
        console.error(`some error happened in work loop: ${e}`)
        // TODO: recover somehow, but make sure
        // that _workHappening is still reset eventually.
        // we probably want to mark the involved box as
        // being in some sort of a broken state.
      }
    }
    this._workHappening = false

    console.log('done with the processing loop')
  }
}
