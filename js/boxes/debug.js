import {APGBox} from '../box.js'

export class SlowComputation extends APGBox {
  constructor () {
    super()
    this.newInputPlug('iterations', this.redoComputation)
    this.newOutputPlug('output')
  }

  createLayout () {
    let button = document.createElement('button')
    button.innerText = 'boop'
    button.addEventListener('click', () => {
      this.scheduleProcessing(this.redoComputation)
    })
    return button
  }

  static metadata () {
    return {category: 'debug', name: 'slow'}
  }

  async redoComputation (yieldControl) {
    let n = this.input.iterations.read()

    let output = 1
    for (let i = 1; i <= n; i++) {
      output = (output * 123456 + 789012) % 1500007

      if ((i & 1023) === 0) {
        await yieldControl()
      }
    }

    this.output.output.write(output)
  }
}
