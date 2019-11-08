// assumes d3.js is imported
import {APGProgram} from './program.js'

export class APG {
	constructor (root) {
		this._root = root
		this._program = new APGProgram(this)

		this._wireRoot = d3.select(this._root).append('svg').node()
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
		                        .classed('box', true)
		                        .attr('id', d => `box-${d}`)
		      // input plugs
		      node.append('ul')
		            .classed('input-plugs', true)
		          .selectAll('li')
		          .data(d => this._program._boxes[d].object._inputOrder.map(p => [d, p]))
		          .join('li')
		            .attr('id', ([d, p]) => `plug-${d}-input-${p}`)
		            .text(([_, p]) => p)

		      // title
		      node.append('div')
		            .classed('title', true)
		            .text(d => d)
		            .call(d3.drag().on('drag', () => {
		              this._program._boxes[d3.event.subject].x += d3.event.x
		              this._program._boxes[d3.event.subject].y += d3.event.y
		              this.refreshProgram()
		            }))

		      // render area
		      node.append('div')
		            .classed('inner', true)

		      // output plugs
		      node.append('ul')
		            .classed('output-plugs', true)
		          .selectAll('li')
		          .data(d => this._program._boxes[d].object._outputOrder.map(p => [d, p]))
		          .join('li')
		            .attr('id', ([d, p]) => `plug-${d}-output-${p}`)
		            .text(([_, p]) => p)

		      return node
		    }
		  )
		    .style('left', d => `${this._program._boxes[d].x}px`)
		    .style('top', d => `${this._program._boxes[d].y}px`)

		let locatePlug = (wireName, end, coord) => {
			let wire = this._program._wires[wireName]
			let boxName = wire[`${end}Box`]
			let plugName = wire[`${end}Plug`]
			let io = (end === 'src') ? 'output' : 'input'
			let element = document.getElementById(`plug-${boxName}-${io}-${plugName}`)
			return element.getBoundingClientRect()[coord]
		}

		d3.select(this._wireRoot)
		    .attr('width', window.innerWidth)
		    .attr('height', window.innerHeight)
		  .selectAll('line')
		  .data(Object.keys(this._program._wires))
		  .join('line')
            .attr('x1', d => locatePlug(d, 'src', 'x') - 14)
            .attr('y1', d => locatePlug(d, 'src', 'y') + 10)
            .attr('x2', d => locatePlug(d, 'dest', 'x') - 14)
            .attr('y2', d => locatePlug(d, 'dest', 'y') + 10)
	}
}
