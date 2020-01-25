import {APGBox} from '../box.js'
import {Variable, Literal, CNFFormula} from '../data_structures/cnf_formula.js'
import {objectClone} from '../utils/objects.js'

export class SatToThreeSat extends APGBox {
  constructor () {
    super()
    this.newInputPlug('formula', this.compute)
    this.newOutputPlug('formula')
  }

  static metadata () {
    return {category: 'karp', name: 'sat_threesat'}
  }

  compute () {
    const original = this.input.formula.read()

    if (original === null) {
      this.output.formula.write(null)
      return
    }

    let extraVarBase = 'a'
    // pick the subscript as (the max subscript used by an a-variable) + 1
    let extraVarSubscript = original.variables.reduce(
      (cur, v) => (v.base === extraVarBase) ? Math.max(cur, v.subscript + 1) : cur,
      0
    )

    let newVariables = objectClone(original.variables)
    let pickExtraVar = () => {
      let res = new Variable(extraVarBase, extraVarSubscript)
      extraVarSubscript++
      newVariables.push(res)
      return res
    }

    let newClauses = []
    for (let clause of original.clauses) {
      if (clause.length <= 3) {
        newClauses.push(clause)
        continue
      }

      let lastExtraVar = pickExtraVar()
      newClauses.push([clause[0], clause[1], new Literal(lastExtraVar, true)])

      for (let i = 2; i < clause.length - 2; i++) {
        let newExtraVar = pickExtraVar()
        newClauses.push([
          new Literal(lastExtraVar, false),
          clause[i],
          new Literal(newExtraVar, true),
        ])
        lastExtraVar = newExtraVar
      }

      newClauses.push([
        new Literal(lastExtraVar, false),
        clause[clause.length - 2],
        clause[clause.length - 1],
      ])
    }

    this.output.formula.write(new CNFFormula(newVariables, newClauses))
  }
}
