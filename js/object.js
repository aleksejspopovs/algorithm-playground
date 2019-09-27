export class APGObject {
	constructor () {
		this._inputPlugs = []
		this._outputPlugs = []

		this._program = null
		this._name = null
		this._needsRender = false
	}

	processMessage (plugName, message) {}
	processEvent (event) {}
	render (node) {}

	addInputPlug (name) {
		if (this._program !== null) {
			throw new Error('cannot add plugs after being attached to a program')
		}
		if (this._inputPlugs.indexOf(name) !== -1) {
			throw new Error(`cannot add duplicate input plug ${name}`)
		}
		this._inputPlugs.push(name)
	}

	addOutputPlug (name) {
		if (this._program !== null) {
			throw new Error('cannot add plugs after being attached to a program')
		}
		if (this._outputPlugs.indexOf(name) !== -1) {
			throw new Error(`cannot add duplicate output plug ${name}`)
		}
		this._outputPlugs.push(name)
	}

	stateUpdated () {
		// TODO: check for _program
		// TODO: deduplication?
		this._program.scheduleRender(this._name)
	}

	outputMessage (plug, message) {
		// TODO: check for _program, existence of plug
		this._program.scheduleMessagesFrom(this._name, plug, message)
	}

	triggerEvent (event) {
		// TODO: check for _program
		this._program.scheduleProcessing(() => this.processEvent(event))
	}

	attachToProgram (program, name) {
		if (this._program !== null) {
			throw new Error('objects can only be attached once')
		}

		this._program = program
		this._name = name

		this._program.scheduleRender(this._name)
	}
}
