import {APGBox} from '../box.js'

export class Hold extends APGBox {
  constructor () {
    super()
    this.newInputPlug('held')
    this.newOutputPlug('value')
  }

  render (node) {
    if (node.getElementsByTagName('button').length === 0) {
      let button = document.createElement('button')
      button.innerText = 'push'
      button.addEventListener('click', (e) => {
        this.scheduleProcessing(() => {
          this.output.value.write(this.input.held.read())
        })
      })
      node.appendChild(button)
    }
  }
}
