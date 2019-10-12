import {APGInputPlug, APGOutputPlug} from './plugs.js'

export class APGObject {
	constructor () {
		this.input = {}
		this.output = {}

		this._inputOrder = []
		this._outputOrder = []

		this._program = null
		this._name = null

		this._isProcessing = false
	}

	processMessage (plugName, message) {}
	processEvent (event) {}
	render (node) {}

	newInputPlug (name, updateHandler = null) {
		if (this._program !== null) {
			throw new Error('cannot add plugs after being attached to a program')
		}
		if (this.input.hasOwnProperty(name)) {
			throw new Error(`cannot add duplicate input plug ${name}`)
		}
		let plug = new APGInputPlug(name, this, updateHandler)
		this.input[name] = plug
		this._inputOrder.push(name)
	}

	newOutputPlug (name) {
		if (this._program !== null) {
			throw new Error('cannot add plugs after being attached to a program')
		}
		if (this.output.hasOwnProperty(name)) {
			throw new Error(`cannot add duplicate output plug ${name}`)
		}
		let plug = new APGOutputPlug(name, this, this._program)
		this.output[name] = plug
		this._outputOrder.push(name)
	}

	scheduleProcessing (callback) {
		if (this._program === null) {
			throw new Error('cannot schedule processing before object has been attached')
		}
		this._program.scheduleProcessing(this._name, callback)
	}

	attachToProgram (program, name) {
		if (this._program !== null) {
			throw new Error('objects can only be attached once')
		}

		Object.freeze(this.inputs)
		Object.freeze(this.outputs)
		Object.freeze(this._inputOrder)
		Object.freeze(this._outputOrder)

		this._program = program
		this._name = name

		this._program.scheduleRender(this._name)
	}
}
