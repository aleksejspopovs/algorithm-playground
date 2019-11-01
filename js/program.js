import {generateUnusedKey} from './utils/objects.js'
import {TwoPriorityQueue} from './utils/queue.js'

function qualifiedPlugName(boxName, plugName) {
	return `${boxName}->${plugName}`
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

	generateBoxName () {
		return generateUnusedKey(this._boxes, 'box_')
	}

	generateWireName () {
		return generateUnusedKey(this._wires, 'wire_')
	}

	addBox (box, name = null) {
		name = name || this.generateBoxName()

		if (this._boxes.hasOwnProperty(name)) {
			throw new Error(`cannot add box with duplicate name ${name}`)
		}

		this._boxes[name] = box
		box.attachToProgram(this, name)

		return name
	}

	addWire (srcBox, srcPlug, destBox, destPlug, name = null) {
		if (!this._boxes.hasOwnProperty(srcBox)) {
			throw new Error(`source box ${srcBox} does not exist`)
		}
		if (!this._boxes[srcBox].output.hasOwnProperty(srcPlug)) {
			throw new Error(`source box ${srcBox} does not have an output plug ${srcPlug}`)
		}
		if (!this._boxes.hasOwnProperty(destBox)) {
			throw new Error(`destination box ${destBox} does not exist`)
		}
		if (!this._boxes[destBox].input.hasOwnProperty(destPlug)) {
			throw new Error(`destination box ${destBox} does not have an input plug ${destPlug}`)
		}

		name = name || this.generateWireName()

		if (this._wires.hasOwnProperty(name)) {
			throw new Error(`cannot add wire with duplicate name ${name}`)
		}

		this._wires[name] = {box: destBox, plug: destPlug}

		let srcPlugFullName = qualifiedPlugName(srcBox, srcPlug)
		if (!this._wiresByPlug.hasOwnProperty(srcPlugFullName)) {
			this._wiresByPlug[srcPlugFullName] = []
		}
		this._wiresByPlug[srcPlugFullName].push(name)

		// update dest value if src value not null
		let srcPlugObj = this._boxes[srcBox].output[srcPlug]
		if (srcPlugObj._value !== null) {
			this.schedulePlugUpdate(destBox, destPlug, srcPlugObj._value)
		}
	}

	renderBox (boxName) {
		let box = this._boxes[boxName]
		let node = this._apg.getRenderTarget(box)
		box.render(node)
		console.log(`rendered ${boxName}`)
	}

	scheduleProcessing (boxName, f) {
		this._workQueue.pushRegular(() => {
			if (this._boxes[boxName]._isProcessing) {
				throw new Error('trying to enter processing mode on box already in it')
			}
			this._boxes[boxName]._isProcessing = true
			try {
				f()
			} finally {
				this._boxes[boxName]._isProcessing = false
				this.scheduleRender(boxName)
			}
		})
		this.performWork()
	}

	scheduleRender (boxName) {
		this._workQueue.pushPrioritized(() => this._apg.render())
		this.performWork()
	}

	schedulePlugUpdate (boxName, plugName, value) {
		this.scheduleProcessing(
			boxName,
			() => this._boxes[boxName].input[plugName]._write(value)
		)
	}

	schedulePlugUpdatesFrom (boxName, plugName, value) {
		let plugFullName = qualifiedPlugName(boxName, plugName)
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
