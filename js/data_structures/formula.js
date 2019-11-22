import {objectsEqual, objectClone, objectFreeze} from '../utils/objects.js'
import {APGData} from '../data.js'

export class Variable extends APGData {
  constructor (base, subscript) {
    super()
    this.base = base
    this.subscript = subscript
  }

  equals (other) {
    return (this.base === other.base) && (this.subscript === other.subscript)
  }

  clone () {
    return new Variable(this.base, this.subscript)
  }

  freeze () {
    Object.freeze(this)
  }

  toString () {
    return `${this.base}_${this.subscript}`
  }

  static compare (varA, varB) {
    // this compares lexicographically by subscript *first*,
    // which is what we'll want to alternate x_1, y_1, x_2, ...
    if (varA.subscript < varB.subscript)
      return -1
    else if (varA.subscript == varB.subscript) {
      if (varA.base < varB.base)
        return -1
      else
        return 0
    } else
      return 1
  }
}

export class Literal extends APGData {
  constructor (variable, valency) {
    super()
    this.variable = variable
    this.valency = valency
  }

  equals (other) {
    return objectsEqual(this.variable, other.variable) && (this.valency === other.valency)
  }

  clone () {
    return new Literal(objectClone(this.variable), this.valency)
  }

  freeze () {
    objectFreeze(this.variable)
    Object.freeze(this)
  }

  toString () {
    return (this.valency ? '' : '!') + this.variable.toString()
  }
}

export class Formula3CNF extends APGData {
  constructor (variables, clauses) {
    super()
    this.variables = variables
    this.clauses = clauses
  }

  equals (other) {
    return objectsEqual(this.variables) && objectsEqual(this.clauses)
  }

  clone () {
    return new Formula3CNF(objectClone(this.variables), objectClone(this.clauses))
  }

  freeze () {
    objectFreeze(this.variables)
    objectFreeze(this.clauses)
    Object.freze(this)
  }

  toString () {
    return this.clauses.map((c) => `(${c.join(' | ')})`).join(' & ')
  }

  static parse(s) {
    function parseLiteral(s) {
      let match = s.match(/^(!?)([a-z]+)_(\d+)$/)
      if (!match) {
        throw new Error(`${s} is not a valid literal`)
      }
      let [_, neg, base, subs] = match
      subs = parseInt(subs)
      return new Literal(new Variable(base, subs), neg === '')
    }

    function parseClause(s) {
      if (!(s.startsWith('(')) || !(s.endsWith(')'))) {
        throw new Error(`${s} is not a valid clause`)
      }
      let literals = s.slice(1, -1).split('|')
      if (literals.length !== 3) {
        throw new Error(`clause ${s} does not have 3 literals`)
      }
      return literals.map(parseLiteral)
    }

    s = s.replace(/ /g, '')
    let clauses = s.split('&').map(parseClause)

    let variableSet = {}
    for (let clause of clauses) {
      for (let literal of clause) {
        // NB: keys are coerced to strings, but values aren't
        variableSet[literal.variable] = literal.variable;
      }
    }

    let variables = Object.values(variableSet).sort(Variable.compare)

    // TODO: might want to also create any missing variables with subscripts
    // between the existing ones

    return new Formula3CNF(variables, clauses)
  }
}
