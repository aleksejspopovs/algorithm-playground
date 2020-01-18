export class ProgramView {
  constructor (root, apg) {
    this.boxRoot = root.append('div').classed('A-program', true)
    this.wireRoot = root.append('svg').classed('A-wires', true)

    // programEpoch is a counter, incremented each time we load a
    // new program.
    this.programEpoch = 0
    this.apg = apg

    let zoom = d3.zoom()
      .on('zoom', () => this.refreshStructure())
      .on('end', () => this.apg.modifyProgram((program) => {
        program._viewParams = this.getParams()
      }))
      .filter(() => {
        // this is the same behavior as the default filter:
        // ignore secondary buttons, such as right-click
        if (d3.event.ctrlKey || d3.event.button) {
          return false
        }

        // ignore double-click
        if (d3.event.type === 'dblclick') {
          return false
        }

        // ignore mousedown on anything other than the program area
        // (e.g. on particular boxes)
        if (d3.event.target !== this.boxRoot.node()) {
          return false;
        }

        return true
      })
    this.boxRoot.call(zoom)

    // when non-empty, this is an object with either two properties
    // (srcBox, srcPlug) or two properties (destBox, destPlug)
    this._pendingWire = {}
    document.addEventListener('mousedown', (e) => {
      // TODO: this will need fixing when we implement workspace panning
      if (!d3.select(e.target).classed('A-plug')) {
        this._pendingWire = {}
        this.refreshStructure()
      }
    }, true)

    this.newProgramLoaded()
  }

  newProgramLoaded () {
    this.programEpoch++
    let savedZoom = this.apg.getProgram()._viewParams.zoom
    if (savedZoom !== undefined) {
      let transform = d3.zoomIdentity
        .translate(savedZoom.x, savedZoom.y)
        .scale(savedZoom.k)
      d3.zoom().transform(this.boxRoot, transform)
    }
    this.refreshStructure()
    this.refreshAllBoxes()
  }

  refreshStructure () {
    // helper for plug onclick handlers
    let clickOnPlug = (side, box, plug) => {
      this._pendingWire[side + 'Box'] = box
      this._pendingWire[side + 'Plug'] = plug
      let otherSide = (side === 'src') ? 'dest' : 'src'
      if (this._pendingWire[otherSide + 'Box'] !== undefined) {
        let {srcBox, srcPlug, destBox, destPlug} = this._pendingWire
        this.apg.modifyProgram(program => program.addWire(srcBox, srcPlug, destBox, destPlug))
        this._pendingWire = {}
      }
      this.refreshStructure()
    }

    // because of javascript scope/`this` shenanigans, we need to use an
    // old-style anonymous function in some places below, and its `this`
    // will be bound to something different, so we need to retain a reference
    // to the ProgramView object.
    let self = this

    // draw boxes
    let zoom = d3.zoomTransform(this.boxRoot.node())
    this.boxRoot
      .selectAll('div.A-box')
      .data(
        Array.from(this.apg.getProgram()._boxes.keys()),
        // this needs to be a regular function because `this`
        // works differently for lambdas
        function (d) {
          // this part of D3 is absolutely ridiculous.
          // we want to manually match boxes to HTML elements, so we're supplying
          // a key function. D3 will call this function for each box, and then
          // *also* for each element. when it's calling it for boxes, the box ID is
          // in the first parameter (`d`) and `this` is set to the parent element
          // of the selection (so the div.A-program in our case), and we want to return
          // a key to be used for that box. when it's calling it for elements, `this`
          // is the element and `d` is the box ID that is currently matched to it, and
          // we want to return a key for the element.

          // this takes care of programEpoch trickery (when we open a new program, there
          // might be a new box in there with an ID that matches that of some box in
          // the old program, and we want to give this new box a whole new element of
          // its own, not reuse the old one)
          return this.classList.contains('A-box') ? this.id : self.getNodeIdForBox(d)
        }
      )
      .join(
        enter => {
          let node = enter.append('div')
          node.classed('A-box', true)
              .attr('id', d => this.getNodeIdForBox(d))

          // veil (covers the box completely, used to indicate when the
          // box is busy)
          node.append('div').classed('A-veil', true)

          // input plugs
          node.append('ul')
                .classed('A-input-plugs-list', true)
              .selectAll('li')
              .data(d => this.apg.getProgram().getBox(d)._inputOrder.map(p => [d, p]))
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
                  this.apg.modifyProgram(program => program.deleteBox(boxId))
                }
              })
              .call(d3.drag()
                .on('drag', () => {
                  let box = d3.event.subject
                  let {movementX, movementY} = d3.event.sourceEvent
                  let zoom = d3.zoomTransform(this.boxRoot.node())
                  this.apg.getProgram()._boxes.get(box).x += movementX / zoom.k
                  this.apg.getProgram()._boxes.get(box).y += movementY / zoom.k
                  this.refreshStructure()
                })
                .on('end', () => {
                  // just to make sure the program is saved
                  this.apg.modifyProgram((program) => {})
                })
              )
          // error display
          titleContainer.append('span')
              .classed('A-error', true)
              .text('⚠️')

          node.append('div')
                .classed('A-inner', true)
              .select(function (d) {
                // conditionally initialize the layout, if the box wants that.
                // we have to use this .select trick instead of just calling
                // .append since that doesn't deal well with a return value of
                // null or undefined.
                let layout = self.apg.getProgram().getBox(d).createLayout()
                if (layout) {
                  return this.appendChild(layout)
                }
                return null
              })

          // output plugs
          node.append('ul')
                .classed('A-output-plugs-list', true)
              .selectAll('li')
              .data(d => this.apg.getProgram().getBox(d)._outputOrder.map(p => [d, p]))
              .join('li')
                .classed('A-plug A-output-plug', true)
                .attr('id', ([d, p]) => `A-plug-${d}-output-${p}`)
                .text(([_, p]) => p)
                .on('click', ([d, p]) => clickOnPlug('src', d, p))

          return node
        }
      )
        .style('left', d => `${this.apg.getProgram()._boxes.get(d).x * zoom.k + zoom.x}px`)
        .style('top', d => `${this.apg.getProgram()._boxes.get(d).y * zoom.k + zoom.y}px`)
        .style('transform', d => `scale(${zoom.k})`)

    // highlight the endpoint of the current pending wire (if any)
    this.boxRoot
      .selectAll('li.A-output-plug')
      .classed('A-selected',
        ([d, p]) =>
          (d === this._pendingWire.srcBox) && (p === this._pendingWire.srcPlug)
      )

    this.boxRoot
      .selectAll('li.A-input-plug')
      .classed('A-selected',
        ([d, p]) =>
          (d === this._pendingWire.destBox) && (p === this._pendingWire.destPlug)
      )

    // helper function for drawing wires between plugs
    let locatePlug = (wireName, end, coord) => {
      let wire = this.apg.getProgram()._wires.get(wireName)
      let boxName = wire[`${end}Box`]
      let plugName = wire[`${end}Plug`]
      let io = (end === 'src') ? 'output' : 'input'
      let element = document.getElementById(`A-plug-${boxName}-${io}-${plugName}`)
      return element.getBoundingClientRect()[coord]
    }

    // draw wires
    this.wireRoot
        .attr('width', window.innerWidth)
        .attr('height', window.innerHeight)
      .selectAll('path')
      .data(Array.from(this.apg.getProgram()._wires.keys()))
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
            this.apg.modifyProgram(program => program.deleteWire(wireId))
          }
        })
  }

  getNodeIdForBox (id) {
    return `A-box-${this.programEpoch}-${id}`
  }

  getNodeForBox (id) {
    let root = document.getElementById(this.getNodeIdForBox(id))
    if (!root) {
      // node not created yet, so let's just not render
      return null
    }
    return root.getElementsByClassName('A-inner')[0]
  }

  refreshBox (id) {
    let box = this.apg.getProgram().getBox(id)
    let node = this.getNodeForBox(id)
    if (node) {
      box.render(node)
    }
  }

  refreshAllBoxes () {
    this.apg.getProgram()._boxes.forEach((_, id) => this.refreshBox(id))
  }

  startBoxProcessing (boxId) {
    this.boxRoot
      .select(`#${this.getNodeIdForBox(boxId)}`)
      .select('.A-veil')
        .interrupt('finish-processing')
        .style('pointer-events', 'all')
        .style('opacity', 0.25)
  }

  finishBoxProcessing (boxId, error) {
    let box = this.boxRoot.select(`#${this.getNodeIdForBox(boxId)}`)

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
    let wire = this.wireRoot.select(`#A-wire-${id}`)
    let initialOffset = wire.style('stroke-dashoffset')
    // convert from 123px to 123
    initialOffset = parseInt(initialOffset.slice(0, -2)) || 0
    wire.transition()
        .duration(250)
        .style('stroke-dashoffset', `${initialOffset - 20}px`)
  }

  getParams () {
    // this is stuff we want to save when saving the program
    return {
      'zoom': d3.zoomTransform(this.boxRoot.node()),
    }
  }
}
