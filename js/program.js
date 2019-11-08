import {generateUnusedKey} from './utils/objects.js'
import {TwoPriorityQueue} from './utils/queue.js'

function qualifiedPlugName(boxId, plugName) {
	return `${boxId}->${plugName}`
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

		this._wires[id] = {box: destBox, plug: destPlug}

		let srcPlugFullName = qualifiedPlugName(srcBox, srcPlug)
		if (!this._wiresByPlug.hasOwnProperty(srcPlugFullName)) {
			this._wiresByPlug[srcPlugFullName] = []
		}
		this._wiresByPlug[srcPlugFullName].push(id)

		// update dest value if src value not null
		let srcPlugObj = this._boxes[srcBox].object.output[srcPlug]
		if (srcPlugObj._value !== null) {
			this.schedulePlugUpdate(destBox, destPlug, srcPlugObj._value)
		}
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
		let plugFullName = qualifiedPlugName(boxId, plugName)
		if (!this._wiresByPlug.hasOwnProperty(plugFullName)) {
			return
		}

		for (let wire of this._wiresByPlug[plugFullName]) {
			let {box, plug} = this._wires[wire]
			this.schedulePlugUpdate(box, plug, value)
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
