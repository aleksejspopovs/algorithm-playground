import {APGProgram} from './program.js'
import {APGObject} from './object.js'
import {SegmentTree} from './segmenttree.js'

class STVisualizer extends APGObject {
	constructor () {
		super()
		this.newInputPlug('tree')
	}

	render (node) {
		return (this.input.tree.read() !== null) ? this.input.tree.read().toString() : 'no tree'
	}
}

class STUpdater extends APGObject {
	constructor () {
		super()
		this.newInputPlug('tree', this.processInput)
		this.newInputPlug('index', this.processInput)
		this.newInputPlug('value', this.processInput)
		this.newOutputPlug('tree')
	}

	processInput () {
		if (
			(this.input.tree.read() === null)
			|| (this.input.index.read() === null)
			|| (this.input.value.read() === null)
		) {
			return
		}

		let tree = this.input.tree.copy()
		tree.set(this.input.index.read(), this.input.value.read())
		this.output.tree.write(tree)
	}
}

class STInitializer extends APGObject {
	constructor () {
		super()
		this.newOutputPlug('tree')
	}

	ping () {
		this.scheduleProcessing(() => this.output.tree.write(new SegmentTree(1, 10)))
	}
}

let program = new APGProgram()
program.addObject(new STInitializer(), 'initializer')
program.addObject(new STVisualizer(), 'visualizer')
program.addObject(new STUpdater(), 'updater')

program.addWire('initializer', 'tree', 'updater', 'tree')
// program.addWire('updater', 'tree', 'updater', 'tree')
program.addWire('updater', 'tree', 'visualizer', 'tree')

program._objects['initializer'].ping()

program.schedulePlugUpdate('updater', 'index', 3)
program.schedulePlugUpdate('updater', 'value', 5)
program.schedulePlugUpdate('updater', 'index', 2)
program.schedulePlugUpdate('updater', 'value', 1)
