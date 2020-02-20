import {APGBox} from '../box.js'

export class Spinner extends APGBox {
  constructor () {
    super()
    this.newInputPlug('value', this.replaceValue)
    this.newOutputPlug('value')
    this.state = {value: 0}
    this.scheduleProcessing(() => this.output.value.write(0))
  }

  static metadata () {
    return {category: 'primitive_io', name: 'spinner'}
  }

  replaceValue () {
    let newValue = this.input.value.read()
    this.state.value = (newValue === null) ? 0 : newValue
    this.output.value.write(this.state.value)
  }

  createLayout () {
    let input = document.createElement('input')
    input.type = 'number'
    input.addEventListener('input', (e) => {
      let value = parseInt(e.target.value)
      this.scheduleProcessing(() => {
        this.state.value = value
        this.output.value.write(value)
      })
    })
    return input
  }

  render (node) {
    node.getElementsByTagName('input')[0].value = this.state.value
  }
}

export class ToString extends APGBox {
  constructor () {
    super()
    this.newInputPlug('value', this.updateValue)
    this.state = {value: null}
  }

  updateValue () {
    this.state.value = this.input.value.read()
  }

  static metadata () {
    return {category: 'primitive_io', name: 'to_string'}
  }

  createLayout () {
    return document.createElement('pre')
  }

  render (node) {
    let output = new String(this.state.value)
    node.children[0].innerText = output
  }
}
