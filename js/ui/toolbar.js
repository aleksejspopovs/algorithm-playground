export class Toolbar {
  constructor (root, apg) {
    this.root = root

    this.root.classed('A-toolbar', true)

    this.root.append('button').text('open program')
        .attr('disabled', true)
    this.root.append('button').text('save program')
        .attr('disabled', true)

    this.root.append('hr')

    this.root.append('button')
        .text('insert box')
        .on('click', () => apg.boxList.toggleVisibility())

    this.root.append('hr')

    this.root.append('button').text('help')
        .attr('disabled', true)
    this.root.append('button').text('about APG')
        .attr('disabled', true)
  }
}
