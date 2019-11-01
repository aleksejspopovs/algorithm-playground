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
		console.log('refreshing program')
		d3.select(this._root)
		  .selectAll('div.box')
		  .data(
		    Object.keys(this._program._boxes),
		    // this needs to be a regular function because `this`
		    // works differently for lambdas
		    function (d) { return d ? d : `box-${this.id}` }
		  )
		  .join(
		  	enter => {
		      let node = enter.append('div')
		                        .attr('class', 'box')
		                        .attr('id', d => `box-${d}`)
		      // input plugs
		      node.append('ul')
		            .attr('class', 'input-plugs')
		            .selectAll('li')
		              .data(d => this._program._boxes[d].object._inputOrder)
		              .join('li')
		                .text(d => d)

		      // title
		      node.append('div')
		            .attr('class', 'title')
		            .text(d => d)
		            .call(d3.drag().on('drag', () => {
		              this._program._boxes[d3.event.subject].x += d3.event.x
		              this._program._boxes[d3.event.subject].y += d3.event.y
		              this.refreshProgram()
		            }))

		      // render area
		      node.append('div')
		          .attr('class', 'inner')

		      // output plugs
		      node.append('ul')
		            .attr('class', 'output-plugs')
		            .selectAll('li')
		              .data(d => this._program._boxes[d].object._outputOrder)
		              .join('li')
		                .text(d => d)

		      return node
		    }
		  )
		  .style('left', d => `${this._program._boxes[d].x}px`)
		  .style('top', d => `${this._program._boxes[d].y}px`)
	}
}
