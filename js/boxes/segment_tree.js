import {APGBox} from '../box.js'
import {SegmentTree} from '../data_structures/segment_tree.js'

export class STVisualizer extends APGBox {
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

export class STUpdater extends APGBox {
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

export class STInitializer extends APGBox {
	constructor () {
		super()
		this.newOutputPlug('tree')
		this.scheduleProcessing(() => this.output.tree.write(new SegmentTree(0, 7)))
	}
}
