// assumes d3.js is imported
import {APGProgram} from './program.js'
import {BoxCategories} from './boxes/index.js'

export class APG {
  constructor (root) {
    this._root = d3.select(root).append('div').classed('A-program', true).node()

    let savedProgram = window.localStorage.program
    if (savedProgram === undefined) {
      this._program = new APGProgram()
    } else {
      this._program = APGProgram.load(savedProgram)
    }
    this._program.attachToUi(this)

    this._wireRoot = d3.select(root).append('svg').classed('A-wires', true).node()

    this._toolboxRoot = d3.select(root).append('div').classed('A-toolbox', true).node()
    d3.select(this._toolboxRoot).append('ul')

    d3.select('body')
      .on('keypress', () => {
        if (d3.event.code === 'KeyQ') {
          let toolbox = d3.select(this._toolboxRoot)
          toolbox.classed('A-visible', !toolbox.classed('A-visible'))
        }
      })

    d3.select(this._root).call(d3.zoom().on('zoom', () => this.refreshProgram()))

    // when non-empty, this is an object with either two properties
    // (srcBox, srcPlug) or two properties (destBox, destPlug)
    this._pendingWire = {}
    document.addEventListener('mousedown', (e) => {
      // TODO: this will need fixing when we implement workspace panning
      if (!d3.select(e.target).classed('A-plug')) {
        this._pendingWire = {}
        this.refreshProgram()
      }
    }, true)

    this.refreshToolbox()
    this.refreshProgram()
    this.refreshAllBoxes()
  }

  getNodeForBox (id) {
    let root = document.getElementById(`A-box-${id}`)
    if (!root) {
      // node not created yet, so let's just not render
      return null
    }
    return root.getElementsByClassName('A-inner')[0]
  }

  refreshBox (id) {
    let box = this._program.getBox(id)
    let node = this.getNodeForBox(id)
    if (node) {
      box.render(node)
    }
  }

  refreshAllBoxes () {
    this._program._boxes.forEach((_, id) => this.refreshBox(id))
  }

  refreshProgram () {
    // helper for plug onclick handlers
    let clickOnPlug = (side, box, plug) => {
      this._pendingWire[side + 'Box'] = box
      this._pendingWire[side + 'Plug'] = plug
      let otherSide = (side === 'src') ? 'dest' : 'src'
      if (this._pendingWire[otherSide + 'Box'] !== undefined) {
        let {srcBox, srcPlug, destBox, destPlug} = this._pendingWire
        this._program.addWire(srcBox, srcPlug, destBox, destPlug)
        this.saveProgram()
        this._pendingWire = {}
      }
      this.refreshProgram()
    }

    // draw boxes
    let zoom = d3.zoomTransform(this._root)
    d3.select(this._root)
      .selectAll('div.A-box')
      .data(
        Array.from(this._program._boxes.keys()),
        // this needs to be a regular function because `this`
        // works differently for lambdas
        function (d) { return d ? d : `A-box-${this.id}` }
      )
      .join(
        enter => {
          let node = enter.append('div')
          node.classed('A-box', true)
              .attr('id', d => `A-box-${d}`)

          // veil (covers the box completely, used to indicate when the
          // box is busy)
          node.append('div').classed('A-veil', true)

          // input plugs
          node.append('ul')
                .classed('A-input-plugs-list', true)
              .selectAll('li')
              .data(d => this._program.getBox(d)._inputOrder.map(p => [d, p]))
              .join('li')
                .classed('A-plug A-input-plug', true)
                .attr('id', ([d, p]) => `A-plug-${d}-input-${p}`)
                .text(([_, p]) => p)
                .on('click', ([d, p]) => clickOnPlug('dest', d, p))

          // title
          let titleContainer = node.append('div')
          titleContainer.append('span')
              .classed('A-title', true)
              .text(d => d)
              .on('click', (boxId) => {
                if (d3.event.altKey) {
                  // delete box
                  this._program.deleteBox(boxId)

                  this.saveProgram()
                }
              })
              .call(d3.drag()
                .on('drag', () => {
                  let box = d3.event.subject
                  let {movementX, movementY} = d3.event.sourceEvent
                  let zoom = d3.zoomTransform(this._root)
                  this._program._boxes.get(box).x += movementX / zoom.k
                  this._program._boxes.get(box).y += movementY / zoom.k
                  this.refreshProgram()
                })
                .on('end', () => {this.saveProgram()})
              )
          // error display
          titleContainer.append('span')
              .classed('A-error', true)
              .text('⚠️')

          // render area
          // because of javascript scope/`this` shenanigans, we need to use an
          // old-style anonymous function below, and its `this` will be bound
          // to the current DOM element, so we need to retain a reference to
          // the APG object.
          let self = this
          node.append('div')
                .classed('A-inner', true)
              .select(function (d) {
                // conditionally initialize the layout, if the box wants that.
                // we have to use this .select trick instead of just calling
                // .append since that doesn't deal well with a return value of
                // null or undefined.
                let layout = self._program.getBox(d).createLayout()
                if (layout) {
                  return this.appendChild(layout)
                }
                return null
              })

          // output plugs
          node.append('ul')
                .classed('A-output-plugs-list', true)
              .selectAll('li')
              .data(d => this._program.getBox(d)._outputOrder.map(p => [d, p]))
              .join('li')
                .classed('A-plug A-output-plug', true)
                .attr('id', ([d, p]) => `A-plug-${d}-output-${p}`)
                .text(([_, p]) => p)
                .on('click', ([d, p]) => clickOnPlug('src', d, p))

          return node
        }
      )
        .style('left', d => `${this._program._boxes.get(d).x * zoom.k + zoom.x}px`)
        .style('top', d => `${this._program._boxes.get(d).y * zoom.k + zoom.y}px`)
        .style('transform', d => `scale(${zoom.k})`)

    // highlight the endpoint of the current pending wire (if any)
    d3.select(this._root)
      .selectAll('li.A-output-plug')
      .classed('A-selected',
        ([d, p]) =>
          (d === this._pendingWire.srcBox) && (p === this._pendingWire.srcPlug)
      )

    d3.select(this._root)
      .selectAll('li.A-input-plug')
      .classed('A-selected',
        ([d, p]) =>
          (d === this._pendingWire.destBox) && (p === this._pendingWire.destPlug)
      )

    // helper function for drawing wires between plugs
    let locatePlug = (wireName, end, coord) => {
      let wire = this._program._wires.get(wireName)
      let boxName = wire[`${end}Box`]
      let plugName = wire[`${end}Plug`]
      let io = (end === 'src') ? 'output' : 'input'
      let element = document.getElementById(`A-plug-${boxName}-${io}-${plugName}`)
      return element.getBoundingClientRect()[coord]
    }

    // draw wires
    d3.select(this._wireRoot)
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)
      .selectAll('path')
      .data(Array.from(this._program._wires.keys()))
      .join('path')
        .attr('id', d => `A-wire-${d}`)
        .attr('d', (d) => {
          // TODO: fix this magic number jankiness
          let x1 = locatePlug(d, 'src', 'x') - 14 * zoom.k
          let y1 = locatePlug(d, 'src', 'y') + 10 * zoom.k
          let x2 = locatePlug(d, 'dest', 'x') - 14 * zoom.k
          let y2 = locatePlug(d, 'dest', 'y') + 10 * zoom.k
          return `M${x1},${y1} C${x1-10 * zoom.k},${y1} ${x2-10 * zoom.k},${y2} ${x2},${y2}`
        })
        .on('click', (wireId) => {
          if (d3.event.altKey) {
            // delete wire
            this._program.deleteWire(wireId)
            this.saveProgram()
          }
        })
  }

  refreshToolbox () {
    d3.select(this._toolboxRoot)
      .select('ul')
      .selectAll('li.A-toolbox-group')
      .data(Array.from(BoxCategories.entries()))
      .join(enter => {
        let node = enter.append('li')
        node.classed('A-toolbox-group', true)
            .text(([group, _]) => group)
        node.append('ul')
        return node
      })
      .select('ul')
      .selectAll('li.A-toolbox-item')
      .data(([_, items]) => items)
      .join('li')
        .classed('A-toolbox-item', true)
        .text(d => d.metadata().name)
        .on('click', (box) => {
          d3.select(this._toolboxRoot).classed('A-visible', false)
          // TODO: make this stick to the pointer until placed, or something
          let boxId = this._program.addBox(new box(), null, d3.event.x - 100, d3.event.y - 100)

          this.saveProgram()
        })
  }

  startBoxProcessing (id) {
    d3.select(this._root)
      .select(`#A-box-${id}`)
      .select('.A-veil')
        .interrupt('finish-processing')
        .style('pointer-events', 'all')
        .style('opacity', 0.25)
  }

  finishBoxProcessing (id, error) {
    let box = d3.select(this._root).select(`#A-box-${id}`)

    box.select('.A-error')
        .classed('A-visible', error !== null)
        .attr('title', error)

    box.select('.A-veil')
      .transition('finish-processing')
        .duration(250)
        .style('pointer-events', 'none')
        .style('opacity', 0)

  }

  flashWireActivity (id) {
    let wire = d3.select(this._wireRoot).select(`#A-wire-${id}`)
    let initialOffset = wire.style('stroke-dashoffset')
    // convert from 123px to 123
    initialOffset = parseInt(initialOffset.slice(0, -2)) || 0
    wire.transition()
        .duration(250)
        .style('stroke-dashoffset', `${initialOffset - 20}px`)
  }

  saveProgram () {
    window.localStorage.program = this._program.save()
  }
}
