import {BoxCategories} from '../boxes/index.js'

export class BoxList {
  constructor (root, getProgram, modifyProgram) {
    this.root = root
    this.addBox = getProgram
    this.modifyProgram = modifyProgram

    this.root.classed('A-toolbox', true)
    this.root.append('ul')

    this.refresh()
  }

  refresh () {
    this.root
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
          this.setVisibility(false)
          // TODO: make this stick to the pointer until placed, or something
          this.modifyProgram(program => {
            program.addBox(new box(), null, d3.event.x, d3.event.y)
          })
        })
  }

  setVisibility (value) {
    this.root.classed('A-visible', value)
  }

  toggleVisibility () {
    this.root.classed('A-visible', !this.root.classed('A-visible'))
  }
}
