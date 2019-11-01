// assumes d3.js is imported
import {APGProgram} from './program.js'

export class APG {
	constructor (root) {
		this._root = root
		this._program = new APGProgram(this)
	}

	getNodeForBox (id) {
		let root = document.getElementById(`box-${id}`)
		if (!root) {
			// node not created yet, so let's just not render
			return null
		}
		// TODO: this is quite horrible, and might break if there are more
		// things with class "inner" inside?
		return root.getElementsByClassName('inner')[0]
	}

	refreshBox (id) {
		let box = this._program._boxes[id].object
		let node = this.getNodeForBox(id)
		if (node) {
			box.render(node)
		}
	}

	refreshProgram () {
		d3.select(this._root)
		  .selectAll('div.box')
		  .data(
		    Object.keys(this._program._boxes),
		    // this needs to be a regular function because `this`
		    // works differently for lambdas
		    function (d) { return d ? d : `box-${this.id}` }
		  )
		  .join(enter => {
		    let node = enter.append('div')
		                      .attr('class', 'box')
		                      .attr('id', (d) => `box-${d}`)
		    node.append('div')
		          .attr('class', 'title')
		          .text((d) => d)
		    node.append('div')
		          .attr('class', 'inner')
		  })
	}
}
