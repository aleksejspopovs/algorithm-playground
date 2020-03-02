import {APGBox} from '../box.js'
import * as DS from '../data_structures/graph.js'
import {enumerate} from '../utils/objects.js'

export class ExampleGraph extends APGBox {
  constructor () {
    super()
    this.newOutputPlug('graph')
    this.scheduleProcessing(() => {
      let g = new DS.Graph()
      g.addNode('tl', 0, 0)
       .addNode('tr', 100, 0)
       .addNode('bl', 0, 100)
       .addNode('br', 100, 100)
       .addEdge('tl', 'br')
       .addEdge('tr', 'bl')
      this.output.graph.write(g)
    })
  }

  static metadata () {
    return {category: 'graph', name: 'example_graph'}
  }
}

export class Graph extends APGBox {
  constructor () {
    super()
    this.newInputPlug('graph', this.replaceGraph)
    this.newInputPlug('nodeColors', this.replaceColors)
    this.newInputPlug('edgeColors', this.replaceColors)
    this.newOutputPlug('graph')
    this.state = {graph: new DS.Graph(), nodeColors: new Map(), edgeColors: new Map()}
    this.scheduleProcessing(this.replaceGraph)
  }

  static metadata () {
    return {category: 'graph', name: 'graph'}
  }

  replaceGraph () {
    this.state.graph = this.input.graph.copy() || (new DS.Graph())
    this.output.graph.write(this.state.graph)
  }

  replaceColors () {
    this.state.nodeColors = this.input.nodeColors.copy() || (new Map())
    this.state.edgeColors = this.input.edgeColors.copy() || (new Map())
  }

  createLayout () {
    let div = document.createElement('div')

    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    div.appendChild(svg)
    svg.setAttribute('width', 320)
    svg.setAttribute('height', 240)
    svg.classList.add('Graph-svg')
    svg.style.border = '1px solid black'
    svg.style.display = 'block'

    let d3svg = d3.select(svg)
    let zoom = d3.zoom()
    d3svg.call(zoom)

    zoom.on('zoom', () => {
      this.render(div)
    })

    d3svg.append('circle')
        .attr('r', 4.5)
        .classed('Graph-graph', true)
        .classed('Graph-ghost-node', true)
        .style('visibility', 'hidden')

    d3svg.append('defs')
      .append('marker')
        .attr('id', 'arrow-end')
        .attr('markerUnits', 'strokeWidth')
        .attr('markerWidth', 10)
        .attr('markerHeight', 5)
        .attr('refX', 6)
        .attr('refY', 0.5)
        .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M1,0.2 L1,0.8 L4,0.5 z')

    let fitButton = document.createElement('button')
    div.appendChild(fitButton)
    fitButton.innerText = 'fit graph'
    fitButton.addEventListener('click', () => this.scheduleProcessing(yieldControl => {
      let boundingBox = this.state.graph.boundingBox()
      zoom.translateTo(
        d3svg,
        (boundingBox.x1 + boundingBox.x2) / 2,
        (boundingBox.y1 + boundingBox.y2) / 2,
      )
      let width = parseInt(svg.getAttribute('width'))
      let height = parseInt(svg.getAttribute('height'))
      let newScale = Math.min(
        width / (boundingBox.x2 - boundingBox.x1 + 10),
        height / (boundingBox.y2 - boundingBox.y1 + 10),
      )
      zoom.scaleTo(d3svg, newScale)
    }))

    let resetButton = document.createElement('button')
    div.appendChild(resetButton)
    resetButton.innerText = 'reset graph'
    resetButton.addEventListener('click', () => this.scheduleProcessing(yieldControl => {
      this.replaceGraph()
    }))

    return div
  }

  render (node) {
    let svg = d3.select(node).select('svg')
    let [nodes, edges] = this.state.graph.flatten()
    let nodeColors = this.state.nodeColors
    let edgeColors = this.state.edgeColors

    // get current zoom transform of the svg to apply to all nodes/edges
    let zoom = d3.zoomTransform(svg.node())

    svg.on('dblclick', () => {
      if (d3.event.ctrlKey) {
        let [x, y] = d3.zoomTransform(svg.node()).invert(
          [d3.event.offsetX, d3.event.offsetY]
        )
        this.scheduleProcessing(() => {
          this.state.graph.addNode(null, x, y)
          this.output.graph.write(this.state.graph)
        })
      }
    })

    let edgeColorClass = (e => `Graph-color-${edgeColors.get(e.name) || 0}`)
    svg.selectAll('.Graph-edge')
      .data(edges)
      .join('line')
        .attr('class', d => `Graph-graph Graph-edge ${edgeColorClass(d)}`)
        .attr('x1', d => zoom.applyX(d.from.x))
        .attr('y1', d => zoom.applyY(d.from.y))
        .attr('x2', d => zoom.applyX(d.to.x))
        .attr('y2', d => zoom.applyY(d.to.y))
        .attr('marker-end', this.state.graph.directed ? 'url(#arrow-end)' : null)
        .on('click', (d) => {
          if (d3.event.altKey) {
            this.scheduleProcessing(() => {
              this.state.graph.deleteEdge(d.name)
              this.output.graph.write(this.state.graph)
            })
          }
        })

    let nodeColorClass = (e => `Graph-color-${nodeColors.get(e.name) || 0}`)
    let newEdgeFrom = null
    svg.selectAll('.Graph-node')
      .data(nodes)
      .join('circle')
        .attr('r', 4.5)
        .attr('class', d => `Graph-graph Graph-node ${nodeColorClass(d)}`)
        .attr('cx', d => zoom.applyX(d.x))
        .attr('cy', d => zoom.applyY(d.y))
        .raise()
        .on('click', (d) => {
          if (d3.event.altKey) {
            this.scheduleProcessing(() => {
              this.state.graph.deleteNode(d.name)
              this.output.graph.write(this.state.graph)
            })
          } else if (d3.event.ctrlKey) {
            if (newEdgeFrom === null) {
              newEdgeFrom = d.name
              d3.select(d3.event.target).classed('Graph-moving', true)
            } else {
              if (newEdgeFrom !== d.name) {
                let newEdge = [newEdgeFrom, d.name]
                this.scheduleProcessing(() => {
                  this.state.graph.addEdge(newEdge[0], newEdge[1])
                  this.output.graph.write(this.state.graph)
                })
              }
              newEdgeFrom = null
              // this only works when cancelling a new edge, not when actually
              // creating one, but that's okay, because creating a new edge
              // schedules processing, which causes a rerender.
              d3.select(d3.event.target).classed('Graph-moving', false)
            }
          }
        })
        .call(d3.drag()
          .filter(() => !d3.event.altKey && !d3.event.ctrlKey && !d3.event.button)
          .on('start', (d) => {
            let node = d3.select(d3.event.sourceEvent.target)
            node.classed('Graph-moving', true)
            ghost.style('visibility', 'visible')
                .attr('cx', zoom.applyX(d.x))
                .attr('cy', zoom.applyY(d.y))
          })
          .on('drag', () => {
            // d3-drag's fancy coordinate computations (in d3.event.{x,y})
            // don't play very well with zooming
            let [x, y] = d3.zoomTransform(svg.node()).invert([
              d3.event.sourceEvent.offsetX,
              d3.event.sourceEvent.offsetY,
            ])
            ghost.attr('cx', zoom.applyX(x)).attr('cy', zoom.applyY(y))
          })
          .on('end', (d) => {
            let [x, y] = d3.zoomTransform(svg.node()).invert([
              d3.event.sourceEvent.offsetX,
              d3.event.sourceEvent.offsetY,
            ])
            ghost.style('visibility', 'hidden')
            this.scheduleProcessing(() => {
              this.state.graph.moveNode(d.name, x, y)
              this.output.graph.write(this.state.graph)
            })
          })
        )

    let ghost = svg.select('.Graph-ghost-node').raise()
  }
}

export class SetsToColors extends APGBox {
  constructor () {
    super()
    this.newInputPlug('set1', this.update)
    this.newInputPlug('set2', this.update)
    this.newInputPlug('set3', this.update)
    this.newOutputPlug('colors')
    this.state = {colors: new Map()}
    this.scheduleProcessing(this.update)
  }

  static metadata () {
    return {category: 'graph', name: 'sets_to_colors'}
  }

  update () {
    this.state.colors.clear()

    for (
      let [color, plug]
      of enumerate([this.input.set1, this.input.set2, this.input.set3], 1)
    ) {
      let set = plug.read()
      if (set === null) {
        continue
      }
      // let's make this work with both Sets and Arrays
      let setIter = (set instanceof Set) ? set.values() : set
      for (let element of setIter) {
        this.state.colors.set(element, color)
      }
    }

    this.output.colors.write(this.state.colors)
  }
}
