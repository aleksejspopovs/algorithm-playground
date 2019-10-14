import {generateUnusedKey} from './util.js'
import {TwoPriorityQueue} from './queue.js'

function qualifiedPlugName(objectName, plugName) {
	return `${objectName}->${plugName}`
}

export class APGProgram {
	constructor () {
		this._objects = {}
		this._wires = {}
		this._wiresByPlug = {}

		this._workQueue = new TwoPriorityQueue()
		this._workHappening = false
	}

	generateObjectName () {
		return generateUnusedKey(this._objects, 'object_')
	}

	generateWireName () {
		return generateUnusedKey(this._wires, 'wire_')
	}

	addObject (object, name = null) {
		name = name || this.generateObjectName()

		if (this._objects.hasOwnProperty(name)) {
			throw new Error(`cannot add object with duplicate name ${name}`)
		}

		this._objects[name] = object
		object.attachToProgram(this, name)

		return name
	}

	addWire (srcObject, srcPlug, destObject, destPlug, name = null) {
		if (!this._objects.hasOwnProperty(srcObject)) {
			throw new Error(`source object ${srcObject} does not exist`)
		}
		if (!this._objects[srcObject].output.hasOwnProperty(srcPlug)) {
			throw new Error(`source object ${srcObject} does not have an output plug ${srcPlug}`)
		}
		if (!this._objects.hasOwnProperty(destObject)) {
			throw new Error(`destination object ${destObject} does not exist`)
		}
		if (!this._objects[destObject].input.hasOwnProperty(destPlug)) {
			throw new Error(`destination object ${destObject} does not have an input plug ${destPlug}`)
		}

		name = name || this.generateWireName()

		if (this._wires.hasOwnProperty(name)) {
			throw new Error(`cannot add wire with duplicate name ${name}`)
		}

		this._wires[name] = {object: destObject, plug: destPlug}

		let srcPlugFullName = qualifiedPlugName(srcObject, srcPlug)
		if (!this._wiresByPlug.hasOwnProperty(srcPlugFullName)) {
			this._wiresByPlug[srcPlugFullName] = []
		}
		this._wiresByPlug[srcPlugFullName].push(name)

		// update dest value if src value not null
		let srcPlugObj = this._objects[srcObject].output[srcPlug]
		if (srcPlugObj._value !== null) {
			this.schedulePlugUpdate(destObject, destPlug, srcPlugObj._value)
		}
	}

	renderObject (objectName) {
		let result = this._objects[objectName].render(null)
		console.log(`rendered ${objectName}: ${result}`)
	}

	scheduleProcessing (objectName, f) {
		this._workQueue.pushRegular(() => {
			if (this._objects[objectName]._isProcessing) {
				throw new Error('trying to enter processing mode on object already in it')
			}
			this._objects[objectName]._isProcessing = true
			try {
				f()
			} finally {
				this._objects[objectName]._isProcessing = false
				this.scheduleRender(objectName)
			}
		})
		this.performWork()
	}

	scheduleRender (objectName) {
		this._workQueue.pushPrioritized(() => this.renderObject(objectName))
		this.performWork()
	}

	schedulePlugUpdate (objectName, plugName, value) {
		this.scheduleProcessing(
			objectName,
			() => this._objects[objectName].input[plugName]._write(value)
		)
	}

	schedulePlugUpdatesFrom (objectName, plugName, value) {
		let plugFullName = qualifiedPlugName(objectName, plugName)
		if (!this._wiresByPlug.hasOwnProperty(plugFullName)) {
			return
		}

		for (let wire of this._wiresByPlug[plugFullName]) {
			let {object, plug} = this._wires[wire]
			this.schedulePlugUpdate(object, plug, value)
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
			pendingOp()
		}
		this._workHappening = false

		console.log('done with the processing loop')
	}
}
