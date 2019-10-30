import {APGProgram} from './program.js'

export class APG {
	constructor (root) {
		this._root = root
		this._objectNodes = {}
		this._program = new APGProgram(this)
	}

	getNodeForObject (object) {
		// TODO: breaks if objects are renamed
		if (!this._objectNodes.hasOwnProperty(object._name)) {
			let node = document.createElement('div')
			node.className = 'object'

			let title = document.createElement('div')
			title.className = 'title'
			title.innerText = `${object._name}`
			node.appendChild(title)

			let inner = document.createElement('div')
			inner.className = 'inner'
			node.appendChild(inner)

			this._root.appendChild(node)
			this._objectNodes[object._name] = node
		}

		// this is quite horrible, and might break if there are more
		// things with class "inner" inside?
		return this._objectNodes[object._name].getElementsByClassName('inner')[0]
	}

	render () {
		// TODO: only rerender objects when it's actually required,
		// probably just rewrite this whole thing with D3
		for (let objName of Object.keys(this._program._objects)) {
			let object = this._program._objects[objName]
			let node = this.getNodeForObject(object)
			object.render(node)
		}
	}
}
