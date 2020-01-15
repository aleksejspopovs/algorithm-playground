import {generateUnusedKey} from './utils/objects.js'
import {Queue} from './utils/queue.js'
import {BoxIndex} from './boxes/index.js'
import {Scheduler, TaskState} from './scheduler.js'

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

    // position on screen
    this.x = x
    this.y = y

    // scheduler-related state:
    // queue of tasks
    this.tasks = new Queue()
    // pointers to next and previous active box in the round-robin queue
    this.nextActive = null
    this.prevActive = null
    // state of the current task at the front of the queue
    this.activeTaskState = TaskState.NotStarted
    // extra state that's relevant when the active task is/has been paused:
    //   - a function to call to resume execution
    this.activeTaskResume = null
    //   - a promise that will resolve after the task is finished
    this.activeTaskDone = null
    //   - a promise that will resolve if the task is paused *again*
    this.activeTaskPaused = null
    //   - a function that resolves activeTaskPaused
    this.activeTaskNotifyPause = null
  }

  active () {
    return !this.tasks.empty()
  }
}

export class APGProgram {
  constructor () {
    this._apg = null
    this._boxes = new Map()
    this._wires = new Map()
    this._wiresByPlug = {}
    this._viewParams = {}

    this._scheduler = new Scheduler(this)
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

    this.refreshProgramStructure()
    this.refreshBox(id)

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

    // TODO: clear tasks

    this.refreshProgramStructure()
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

    this.refreshProgramStructure()

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

    this.refreshProgramStructure()
  }

  scheduleProcessing (boxId, f) {
    this._scheduler.addTask(boxId, f)
    this._scheduler.run()
  }

  refreshProgramStructure () {
    this._apg && this._apg.refreshProgramStructure()
  }

  refreshBox (boxId) {
    this._apg && this._apg.refreshBox(boxId)
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

  save () {
    let serialized = {
      'apg': true,
      'version': 1,
    }
    serialized.boxes = []
    for (let [id, box] of this._boxes.entries()) {
      serialized.boxes.push({id: id, x: box.x, y: box.y, type: box.object.constructor._typeId()})
    }
    serialized.wires = Array.from(
      this._wires.entries(),
      ([id, wire]) => ({id, ...wire})
    )
    serialized.viewParams = this._viewParams
    return JSON.stringify(serialized)
  }

  static load (string) {
    let serialized = JSON.parse(string)
    if (serialized.apg !== true) {
      throw new Error('file is not an APG program')
    }
    if (serialized.version !== 1) {
      throw new Error(`unexpected program version ${serialized.version}`)
    }

    let program = new APGProgram()
    for (let {id, x, y, type} of serialized.boxes) {
      let boxType = BoxIndex.get(type)
      program.addBox(new boxType(), id, x, y)
    }
    for (let {id, srcBox, srcPlug, destBox, destPlug} of serialized.wires) {
      program.addWire(srcBox, srcPlug, destBox, destPlug, id)
    }
    program._viewParams = serialized.viewParams
    return program
  }
}
