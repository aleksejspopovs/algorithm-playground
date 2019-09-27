import {APGProgram} from './program.js'
import {APGObject} from './object.js'
import {SegmentTree} from './segmenttree.js'

class STVisualizer extends APGObject {
	constructor () {
		super()
		this.addInputPlug('tree')
		this.state = {tree: null}
	}

	processMessage (plugName, message) {
		// TODO this violates constraint about not relying on message contents :(
		this.state.tree = message
		this.stateUpdated()
	}

	render (node) {
		return (this.state.tree !== null) ? this.state.tree.toString() : 'no tree'
	}
}

class STUpdater extends APGObject {
	constructor () {
		super()
		this.addInputPlug('tree')
		this.addInputPlug('index')
		this.addInputPlug('value')
		this.addOutputPlug('tree')
		this.state = {tree: null, index: null}
	}

	processMessage (plugName, message) {
		// TODO: this object performs its action when the third plug is triggered.
		// should we come up with guidelines around stuff like this?
		switch (plugName) {
			case 'tree':
				// TODO: violates immutability
				this.state.tree = message
				this.stateUpdated()
			break;
			case 'index':
				this.state.index = message
				this.stateUpdated()
			break;
			case 'value':
				this.state.tree.set(this.state.index, message)
				this.outputMessage('tree', this.state.tree)
				this.stateUpdated()
			break;
		}
	}
}

class STInitializer extends APGObject {
	constructor () {
		super()
		this.addOutputPlug('tree')
	}

	processEvent (event) {
		this.outputMessage('tree', new SegmentTree(1, 10))
	}
}

let program = new APGProgram()
console.log(program)
program.addObject(new STInitializer(), 'initializer')
program.addObject(new STVisualizer(), 'visualizer')
program.addObject(new STUpdater(), 'updater')

program.addWire('initializer', 'tree', 'updater', 'tree')
program.addWire('updater', 'tree', 'updater', 'tree')
program.addWire('updater', 'tree', 'visualizer', 'tree')

program._objects['initializer'].triggerEvent('ping')
program.scheduleMessageTo('updater', 'index', 3)
program.scheduleMessageTo('updater', 'value', 5)
program.scheduleMessageTo('updater', 'index', 2)
program.scheduleMessageTo('updater', 'value', 1)
