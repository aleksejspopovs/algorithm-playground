import {APGBox} from '../box.js'

export class Spinner extends APGBox {
  constructor () {
    super()
    this.newOutputPlug('value')
    this.state = {value: 0}
    this.scheduleProcessing(() => this.output.value.write(0))
  }

  static metadata () {
    return {category: 'primitive_io', name: 'spinner'}
  }

  createLayout () {
    let new_input = document.createElement('input')
    new_input.type = 'number'
    new_input.addEventListener('input', (e) => {
      let value = parseInt(e.target.value)
      this.scheduleProcessing(() => {
        this.state.value = value
        this.output.value.write(value)
      })
    })
    return new_input
  }

  render (node) {
    node.getElementsByTagName('input')[0].value = this.state.value
  }
}

export class ToString extends APGBox {
  constructor () {
    super()
    this.newInputPlug('value')
  }

  static metadata () {
    return {category: 'primitive_io', name: 'to_string'}
  }

  createLayout () {
    return document.createElement('pre')
  }

  render (node) {
    let value = this.input.value.read()
    let output = new String(value)
    node.children[0].innerText = output
  }
}
