export class Toolbar {
  constructor (root, apg) {
    this.root = root
    this.apg = apg

    this.openFileSelector = this.root.append('input')
        .attr('type', 'file')
        .attr('accept', '.apg')
        .style('display', 'none')
        .node()
    this.openFileSelector.addEventListener('change', () => this.readFile())
    this.saveFileURL = null
    this.saveLink = this.root.append('a')
        .attr('download', 'program.apg')
        .style('display', 'none')
        .node()

    this.root.classed('A-toolbar', true)

    this.root.append('button')
        .text('new program')
        .on('click', () => this.apg.newProgram())
    this.root.append('button')
        .text('open program')
        .on('click', () => this.openFileSelector.click())
    this.root.append('button')
        .text('save program')
        .on('click', () => this.saveFile())

    this.root.append('hr')

    this.root.append('button')
        .text('insert box')
        .on('click', () => this.apg.boxList.toggleVisibility())

    this.root.append('hr')

    this.root.append('button').text('help')
        .attr('disabled', true)
    this.root.append('button').text('about APG')
        .attr('disabled', true)
  }

  readFile () {
    let files = this.openFileSelector.files
    if (files.length > 0) {
      let file = files[0]
      file.text().then(text => this.apg.loadProgram(text))
    }
  }

  saveFile () {
    let data = new Blob([this.apg.getProgram().save()], {type: 'text/plain'})

    if (this.saveFileURL !== null) {
      window.URL.revokeObjectURL(this.saveFileURL)
    }

    this.saveFileURL = window.URL.createObjectURL(data)
    this.saveLink.href = this.saveFileURL
    this.saveLink.click()
  }
}
