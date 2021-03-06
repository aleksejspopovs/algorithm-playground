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
    // this compares lexicographically by base then subscript
    if (varA.base < varB.base) {
      return -1
    } else if (varA.base === varB.base) {
      return (varA.subscript < varB.subscript) ? -1 : 0
    } else {
      return 1
    }
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

  satisfiedBy (assignment) {
    return this.valency === assignment.has(this.variable.toString())
  }

  toString () {
    return (this.valency ? '' : '!') + this.variable.toString()
  }
}

export class CNFFormula extends APGData {
  constructor (variables, clauses) {
    super()
    this.variables = variables
    this._variableSet = new Set()
    for (let v of this.variables) {
      this._variableSet.add(v.toString())
    }
    this.clauses = clauses
  }

  equals (other) {
    return objectsEqual(this.variables, other.variables) && objectsEqual(this.clauses, other.clauses)
  }

  clone () {
    return new CNFFormula(objectClone(this.variables), objectClone(this.clauses))
  }

  freeze () {
    objectFreeze(this.variables)
    objectFreeze(this.clauses)
    Object.freze(this)
  }

  toString () {
    return this.clauses.map((c) => `(${c.join(' | ')})`).join(' & ')
  }

  degreeExactly (k) {
    return this.clauses.every(c => c.length === k)
  }

  degreeAtMost (k) {
    return this.clauses.every(c => c.length <= k)
  }

  hasVariable (v) {
    // the .toString() ensures that this works both with Variable objects and strings
    return this._variableSet.has(v.toString())
  }

  satisfiedBy (assignment) {
    // assignment is Set of toStringed variables that are to be
    // set to true
    return this.clauses.every(c => c.some(l => l.satisfiedBy(assignment)))
  }

  simplified () {
    // returns a copy of the formula, guaranteed to not contain
    // variable repetitions inside a clause (like (x_1 | x_1) or
    // (x_1 | !x_1))
    let newClauses = []

    for (let clause of this.clauses) {
      let variablesSeen = new Map()
      let simplifiedClause = []
      let clauseIsTrivial = false
      for (let literal of clause) {
        let v = literal.variable.toString()
        if (variablesSeen.has(v)) {
          if (variablesSeen.get(v) !== literal.valency) {
            clauseIsTrivial = true
            break
          }
        } else {
          variablesSeen.set(v, literal.valency)
          simplifiedClause.push(literal.clone())
        }
      }

      if (!clauseIsTrivial) {
        newClauses.push(simplifiedClause)
      }
    }

    return new CNFFormula(objectClone(this.variables), newClauses)
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
      if (literals.length === 0) {
        throw new Error(`clause ${s} is empty`)
      }
      return literals.map(parseLiteral)
    }

    s = s.replace(/ /g, '')

    if (s === '') {
      return new CNFFormula([], [])
    }

    let clauses = s.split('&').map(parseClause)

    // two variable objects that represent the same variable (same base
    // and subscript) might still not compare as equal because the objects
    // are different, so we canonicalize them to strings to find just the
    // distinct variables.
    let variableSet = new Map()
    for (let clause of clauses) {
      for (let literal of clause) {
        variableSet.set(literal.variable.toString(), literal.variable)
      }
    }

    let variables = Array.from(variableSet.values()).sort(Variable.compare)

    return new CNFFormula(variables, clauses)
  }
}
