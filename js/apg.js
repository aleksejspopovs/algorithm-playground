import {APGProgram} from './program.js'

export class APG {
	constructor (root) {
		this._root = root
		this._boxNodes = {}
		this._program = new APGProgram(this)
	}

	getNodeForBox (box) {
		// TODO: breaks if boxes are renamed
		if (!this._boxNodes.hasOwnProperty(box._name)) {
			let node = document.createElement('div')
			node.className = 'box'

			let title = document.createElement('div')
			title.className = 'title'
			title.innerText = `${box._name}`
			node.appendChild(title)

			let inner = document.createElement('div')
			inner.className = 'inner'
			node.appendChild(inner)

			this._root.appendChild(node)
			this._boxNodes[box._name] = node
		}

		// this is quite horrible, and might break if there are more
		// things with class "inner" inside?
		return this._boxNodes[box._name].getElementsByClassName('inner')[0]
	}

	render () {
		// TODO: only rerender boxes when it's actually required,
		// probably just rewrite this whole thing with D3
		for (let name of Object.keys(this._program._boxes)) {
			let box = this._program._boxes[name]
			let node = this.getNodeForBox(box)
			box.render(node)
		}
	}
}
