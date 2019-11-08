// assumes d3.js is imported
import {APGProgram} from './program.js'
import BoxIndex from './boxes/index.js'

export class APG {
  constructor (root) {
    this._root = root
    this._program = new APGProgram(this)

    this._wireRoot = d3.select(this._root).append('svg').node()

    this._toolboxRoot = d3.select(this._root).append('div').classed('toolbox', true).node()
    d3.select(this._toolboxRoot).append('ul')
    this.refreshToolbox()

    d3.select('body')
      .on('keypress', () => {
        if (d3.event.code === 'KeyQ') {
          let toolbox = d3.select(this._toolboxRoot)
          toolbox.classed('visible', !toolbox.classed('visible'))
        }
      })

    // when non-empty, this is an object with either two properties
    // (srcBox, srcPlug) or two properties (destBox, destPlug)
    this._pendingWire = {}
    document.addEventListener('mousedown', (e) => {
      // TODO: this will need fixing when we implement workspace panning
      if (!d3.select(e.target).classed('plug')) {
        this._pendingWire = {}
        this.refreshProgram()
      }
    }, true)
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
    // draw boxes
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
          node.classed('box', true)
              .attr('id', d => `box-${d}`)

          // input plugs
          node.append('ul')
                .classed('input-plugs-list', true)
              .selectAll('li')
              .data(d => this._program._boxes[d].object._inputOrder.map(p => [d, p]))
              .join('li')
                .classed('plug input-plug', true)
                .attr('id', ([d, p]) => `plug-${d}-input-${p}`)
                .text(([_, p]) => p)
                .on('click', () => {
                  let [destBox, destPlug] = d3.select(d3.event.srcElement).data()[0]
                  if (this._pendingWire.srcBox !== undefined) {
                    let {srcBox, srcPlug} = this._pendingWire
                    this._program.addWire(srcBox, srcPlug, destBox, destPlug)
                    this._pendingWire = {}
                  } else {
                    this._pendingWire = {destBox, destPlug}
                  }
                  this.refreshProgram()
                })

          // title
          node.append('div')
                .classed('title', true)
                .text(d => d)
                .call(d3.drag().on('drag', () => {
                  let box = d3.event.subject
                  let {movementX, movementY} = d3.event.sourceEvent
                  this._program._boxes[box].x += movementX
                  this._program._boxes[box].y += movementY
                  this.refreshProgram()
                }))

          // render area
          node.append('div')
                .classed('inner', true)

          // output plugs
          node.append('ul')
                .classed('output-plugs-list', true)
              .selectAll('li')
              .data(d => this._program._boxes[d].object._outputOrder.map(p => [d, p]))
              .join('li')
                .classed('plug output-plug', true)
                .attr('id', ([d, p]) => `plug-${d}-output-${p}`)
                .text(([_, p]) => p)
                .on('click', () => {
                  let [srcBox, srcPlug] = d3.select(d3.event.srcElement).data()[0]
                  if (this._pendingWire.destBox !== undefined) {
                    let {destBox, destPlug} = this._pendingWire
                    this._program.addWire(srcBox, srcPlug, destBox, destPlug)
                    this._pendingWire = {}
                  } else {
                    this._pendingWire = {srcBox, srcPlug}
                  }
                  this.refreshProgram()
                })

          return node
        }
      )
        .style('left', d => `${this._program._boxes[d].x}px`)
        .style('top', d => `${this._program._boxes[d].y}px`)

    // highlight the endpoint of the current pending wire (if any)
    d3.select(this._root)
      .selectAll('li.output-plug')
      .classed('selected',
        ([d, p]) =>
          (d === this._pendingWire.srcBox) && (p === this._pendingWire.srcPlug)
      )

    d3.select(this._root)
      .selectAll('li.input-plug')
      .classed('selected',
        ([d, p]) =>
          (d === this._pendingWire.destBox) && (p === this._pendingWire.destPlug)
      )

    // helper function for drawing wires between plugs
    let locatePlug = (wireName, end, coord) => {
      let wire = this._program._wires[wireName]
      let boxName = wire[`${end}Box`]
      let plugName = wire[`${end}Plug`]
      let io = (end === 'src') ? 'output' : 'input'
      let element = document.getElementById(`plug-${boxName}-${io}-${plugName}`)
      return element.getBoundingClientRect()[coord]
    }

    // draw wires
    d3.select(this._wireRoot)
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)
      .selectAll('path')
      .data(Object.keys(this._program._wires))
      .join('path')
        .attr('d', (d) => {
          let x1 = locatePlug(d, 'src', 'x') - 14
          let y1 = locatePlug(d, 'src', 'y') + 10
          let x2 = locatePlug(d, 'dest', 'x') - 14
          let y2 = locatePlug(d, 'dest', 'y') + 10
          return `M${x1},${y1} C${x1-10},${y1} ${x2-10},${y2} ${x2},${y2}`
        })
  }

  refreshToolbox () {
    d3.select(this._toolboxRoot)
      .select('ul')
      .selectAll('li.toolbox-group')
      .data(BoxIndex)
      .join(enter => {
        let node = enter.append('li')
        node.classed('toolbox-group', true)
            .text(([group, _]) => group)
        node.append('ul')
        return node
      })
      .select('ul')
      .selectAll('li.toolbox-item')
      .data(([_, items]) => items)
      .join('li')
        .classed('toolbox-item', true)
        .text(d => d.name)
        .on('click', () => {
          let box = d3.select(d3.event.srcElement).data()[0]
          this._program.addBox(new box())
        })
  }
}
