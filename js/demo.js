import {APG} from './apg.js'
import {APGObject} from './object.js'
import {SegmentTree} from './segmenttree.js'

class STVisualizer extends APGObject {
	constructor () {
		super()
		this.newInputPlug('tree')
	}

	render (node) {
		let tree = this.input.tree.read()
		let output = (tree !== null) ? tree.toString() : 'no tree'
		node.innerHTML = `<pre>${output}</pre>` // warning: don't do this at home
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

let apg = new APG(document.body)
apg._program.addObject(new STInitializer(), 'initializer')
apg._program.addObject(new STVisualizer(), 'visualizer')
apg._program.addObject(new STUpdater(), 'updater')

apg._program.addWire('initializer', 'tree', 'updater', 'tree')
// apg._program.addWire('updater', 'tree', 'updater', 'tree')
apg._program.addWire('updater', 'tree', 'visualizer', 'tree')

apg._program._objects['initializer'].ping()

apg._program.schedulePlugUpdate('updater', 'index', 3)
apg._program.schedulePlugUpdate('updater', 'value', 5)
apg._program.schedulePlugUpdate('updater', 'index', 2)
apg._program.schedulePlugUpdate('updater', 'value', 1)
