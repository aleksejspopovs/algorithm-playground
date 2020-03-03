import {APGBox} from '../box.js'
import * as DS from '../data_structures/cnf_formula.js'
import {objectClone} from '../utils/objects.js'

export class CNFFormula extends APGBox {
  constructor () {
    super()
    this.newInputPlug('formula', this.replaceFormula)
    this.newOutputPlug('formula')
    this.state = {formula: new DS.CNFFormula([], [])}
    this.scheduleProcessing(() => this.output.formula.write(this.state.formula))
  }

  static metadata () {
    return {category: 'cnf_formula', name: 'cnf_formula'}
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
        var newFormula = DS.CNFFormula.parse(formulaText)
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

export class Assignment extends APGBox {
  constructor () {
    super()
    this.newInputPlug('formula', () => this.replaceInput('formula'))
    this.newInputPlug('assignment', () => this.replaceInput('assignment'))
    this.newOutputPlug('assignment')
    this.state = {formula: null, satisfied: false, assignment: new Set()}
  }

  static metadata () {
    return {category: 'cnf_formula', name: 'assignment'}
  }

  outputAssignment () {
    // internally, we keep the exact assignment that we were given,
    // even though it might contain variables not found in the current
    // formula. we do this because someone might be trying to update
    // the formula and the assignment simultaneously, but the assignment
    // arrives first, and we don't want to throw random variables out of
    // it. but when outputting, we always want to give a valid assignment
    // to the current variable.
    let assignment = objectClone(this.state.assignment)
    for (let v of assignment.values()) {
      if (!this.state.formula || !this.state.formula.hasVariable(v)) {
        assignment.delete(v)
      }
    }
    this.output.assignment.write(assignment)
  }

  replaceInput (which) {
    if (which === 'formula') {
      this.state.formula = this.input.formula.copy()
    } else {
      this.state.assignment = this.input.assignment.copy()
    }

    this.outputAssignment()

    this.state.satisfied = (
      this.state.formula && this.state.formula.satisfiedBy(this.state.assignment)
    )
  }

  setVariable (variable, value) {
    if (value) {
      this.state.assignment.add(variable.toString())
    } else {
      this.state.assignment.delete(variable.toString())
    }
    this.outputAssignment()
    this.state.satisfied = this.state.formula.satisfiedBy(this.state.assignment)
  }

  createLayout () {
    let outer = document.createElement('div')
    let vars = document.createElement('div')
    vars.style.width = '250px'
    vars.classList.add('CNFFormula-vars')
    outer.append(vars)
    let satisfied = document.createElement('div')
    satisfied.classList.add('CNFFormula-satisfied')
    outer.append(satisfied)
    return outer
  }

  render (node) {
    let variables = (
      this.state.formula
      ? this.state.formula.variables
      : []
    )

    let outer = d3.select(node).select('div')
    let labels = outer.select('div.CNFFormula-vars')
      .selectAll('label')
      .data(variables)
      .join(enter => {
        let label = enter.append('label')
        label.append('input').attr('type', 'checkbox')
        label.append('span')
        label.append('sub')
        return label
      })

    labels.select('input')
      .property('checked', v => this.state.assignment.has(v.toString()))
      .on('click', (v, i, g) => {
        let checkbox = g[i]
        this.scheduleProcessing(() => this.setVariable(v, checkbox.checked))
      })
    labels.select('span').text(v => v.base)
    labels.select('sub').text(v => v.subscript)

    outer.select('div.CNFFormula-satisfied')
      .text(`satisfied: ${this.state.satisfied}`)
  }
}
