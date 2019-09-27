import {generateUnusedKey} from './util.js'
import {PriorityQueue} from './queue.js'

export class APGProgram {
	constructor () {
		this._objects = {}
		this._wires = {}
		this._wiresByPlug = {}

		this._workQueue = new PriorityQueue()
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
		if (this._objects[srcObject]._outputPlugs.indexOf(srcPlug) === -1) {
			throw new Error(`source object ${srcObject} does not have an output plug ${srcPlug}`)
		}
		if (!this._objects.hasOwnProperty(destObject)) {
			throw new Error(`destination object ${destObject} does not exist`)
		}
		if (this._objects[destObject]._inputPlugs.indexOf(destPlug) === -1) {
			throw new Error(`destination object ${destObject} does not have an input plug ${destPlug}`)
		}

		name = name || this.generateWireName()

		if (this._wires.hasOwnProperty(name)) {
			throw new Error(`cannot add wire with duplicate name ${name}`)
		}

		this._wires[name] = {object: destObject, plug: destPlug}

		let srcPlugFullName = `${srcObject}->${srcPlug}` // TODO factor out
		if (!this._wiresByPlug.hasOwnProperty(srcPlugFullName)) {
			this._wiresByPlug[srcPlugFullName] = []
		}
		this._wiresByPlug[srcPlugFullName].push(name)
	}

	renderObject (objectName) {
		let result = this._objects[objectName].render(null)
		console.log(`rendered ${objectName}: ${result}`)
	}

	scheduleProcessing (f) {
		this._workQueue.push(f, 1)
		this.performWork()
	}

	scheduleRender (objectName) {
		this._workQueue.push(() => this.renderObject(objectName), 2)
		this.performWork()
	}

	scheduleMessageTo (objectName, plugName, message) {
		this.scheduleProcessing(
			() => this._objects[objectName].processMessage(plugName, message)
		)
	}

	scheduleMessagesFrom (objectName, plugName, message) {
		let plugFullName = `${objectName}->${plugName}` // TODO factor out
		if (!this._wiresByPlug.hasOwnProperty(plugFullName)) {
			return
		}

		for (let wire of this._wiresByPlug[plugFullName]) {
			let {object, plug} = this._wires[wire]
			this.scheduleMessageTo(object, plug, message)
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
