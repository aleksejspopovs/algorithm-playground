import {APGBox} from '../box.js'
import * as DS from '../data_structures/formula.js'

export class Formula extends APGBox {
  constructor () {
    super()
    this.newInputPlug('formula', this.replaceFormula)
    this.newOutputPlug('formula')
    this.state = {formula: new DS.Formula3CNF([], [])}
    this.scheduleProcessing(() => this.output.formula.write(this.state.formula))
  }

  static metadata () {
    return {category: 'formula', name: 'formula'}
  }

  replaceFormula () {
    this.state.formula = this.input.formula.copy()
    this.output.formula.write(this.state.formula)
  }

  createLayout () {
    let errorDisplay = document.createElement('div')
    let textarea = document.createElement('textarea')
    textarea.rows = 4
    textarea.cols = 20
    textarea.addEventListener('input', (e) => {
      let formulaText = e.target.value
      try {
        var newFormula = DS.Formula3CNF.parse(formulaText)
      } catch (e) {
        errorDisplay.innerText = `error: ${e}`
        return
      }

      errorDisplay.innerText = ''

      this.scheduleProcessing(() => {
        this.state.formula = newFormula
        this.output.formula.write(newFormula)
      })
    })

    let div = document.createElement('div')
    div.appendChild(textarea)
    div.appendChild(errorDisplay)
    return div
  }

  render (node) {
    node.getElementsByTagName('textarea')[0].value = this.state.formula.toString()
  }
}
