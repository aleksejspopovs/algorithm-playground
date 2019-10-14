import {APG} from './apg.js'
import {APGObject} from './object.js'
import {SegmentTree} from './segmenttree.js'

class Spinner extends APGObject {
	constructor () {
		super()
		this.newOutputPlug('value')
		this.state = {value: 0}
	}

	render (node) {
		if (node.getElementsByTagName('input').length === 0) {
			let new_input = document.createElement('input')
			new_input.type = 'number'
			new_input.addEventListener('input', (e) => {
				let value = parseInt(e.target.value)
				this.scheduleProcessing(() => {
					this.state.value = value
					this.output.value.write(value)
				})
			})
			node.appendChild(new_input)
		}

		node.getElementsByTagName('input')[0].value = this.state.value
	}
}

class Hold extends APGObject {
	constructor () {
		super()
		this.newInputPlug('held')
		this.newOutputPlug('value')
	}

	render (node) {
		if (node.getElementsByTagName('button').length === 0) {
			let button = document.createElement('button')
			button.innerText = 'push'
			button.addEventListener('click', (e) => {
				this.scheduleProcessing(() => {
					this.output.value.write(this.input.held.read())
				})
			})
			node.appendChild(button)
		}
	}
}

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
		this.scheduleProcessing(() => this.output.tree.write(new SegmentTree(0, 7)))
	}
}

let apg = new APG(document.body)
apg._program.addObject(new STInitializer(), 'initializer')
apg._program.addObject(new STVisualizer(), 'visualizer')
apg._program.addObject(new STUpdater(), 'updater')
apg._program.addObject(new Spinner(), 'index')
apg._program.addObject(new Spinner(), 'value')
apg._program.addObject(new Hold(), 'hold')

apg._program.addWire('initializer', 'tree', 'updater', 'tree')
apg._program.addWire('hold', 'value', 'updater', 'tree')
apg._program.addWire('index', 'value', 'updater', 'index')
apg._program.addWire('value', 'value', 'updater', 'value')
apg._program.addWire('updater', 'tree', 'visualizer', 'tree')
apg._program.addWire('updater', 'tree', 'hold', 'held')

apg._program._objects['initializer'].ping()

// apg._program.schedulePlugUpdate('updater', 'index', 3)
// apg._program.schedulePlugUpdate('updater', 'value', 5)
// apg._program.schedulePlugUpdate('updater', 'index', 2)
// apg._program.schedulePlugUpdate('updater', 'value', 1)
