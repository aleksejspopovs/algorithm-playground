import {APGBox} from '../box.js'
import * as DS from '../data_structures/graph.js'

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
       .addEdge(null, 'tl', 'br')
       .addEdge(null, 'tr', 'bl')
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
    this.newOutputPlug('graph')
    this.state = {graph: new DS.Graph()}
    this.scheduleProcessing(() => this.output.graph.write(this.state.graph))
  }

  static metadata () {
    return {category: 'graph', name: 'graph'}
  }

  replaceGraph () {
    this.state.graph = this.input.graph.copy()
    this.output.graph.write(this.state.graph)
  }

  createLayout () {
    let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', 320)
    svg.setAttribute('height', 240)
    svg.classList.add('Graph-svg')
    svg.style.border = '1px solid black'

    let d3svg = d3.select(svg)
    d3svg.call(d3.zoom().on('zoom', () => {
      d3svg.selectAll('.Graph-graph').attr('transform', d3.event.transform)
    }))
    return svg
  }

  render (node) {
    let svg = d3.select(node).select('svg')
    let [nodes_data, edges_data] = this.state.graph.flatten()

    // get current zoom transform of the svg to apply to all nodes/edges
    let zoom = d3.zoomTransform(svg.node())

    svg.selectAll('.Graph-edge')
      .data(edges_data)
      .join('line')
        .classed('Graph-graph', true)
        .classed('Graph-edge', true)
        .attr('x1', (d) => d.from.x)
        .attr('y1', (d) => d.from.y)
        .attr('x2', (d) => d.to.x)
        .attr('y2', (d) => d.to.y)
        .attr('transform', zoom)
        .attr('marker-end', this.state.graph.directed ? 'url(#arrow-end)' : null)

    svg.selectAll('.Graph-node')
      .data(nodes_data)
      .join('circle')
        .attr('r', 4.5)
        .classed('Graph-graph', true)
        .classed('Graph-node', true)
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('transform', zoom)
        .raise()
  }
}
