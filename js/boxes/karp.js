import {APGBox} from '../box.js'
import {Variable, Literal, CNFFormula} from '../data_structures/cnf_formula.js'
import {Graph} from '../data_structures/graph.js'
import {objectClone, enumerate} from '../utils/objects.js'

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

export class SatToClique extends APGBox {
  constructor () {
    super()
    this.newInputPlug('formula', this.compute)
    this.newOutputPlug('graph')
    this.newOutputPlug('cliqueSize')
  }

  static metadata () {
    return {category: 'karp', name: 'sat_clique'}
  }

  compute () {
    const original = this.input.formula.read()
    let formula = original.simplified()

    if (formula === null) {
      this.output.graph.write(null)
      this.output.cliqueSize.write(null)
      return
    }

    let graph = new Graph()

    // number variables with natural numbers
    let variablesNumbered = new Map()
    for (let [i, v] of enumerate(formula.variables)) {
      variablesNumbered.set(v.toString(), i)
    }

    for (let [i, clause] of enumerate(formula.clauses)) {
      for (let [j, literal] of enumerate(clause)) {
        let x = variablesNumbered.get(literal.variable.toString()) * 30
        let y = i * 30
        // literals inside a clause are uniquely identified by their
        // variable names (since the formula is simplified)
        graph.addNode(`cl_${i}_${literal.variable}`, x, y)
      }
    }

    for (let [i, clauseA] of enumerate(formula.clauses)) {
      for (let j = 0; j < i; j++) {
        let clauseB = formula.clauses[j]

        for (let literalA of clauseA) {
          for (let literalB of clauseB) {
            // if literals are compatible, connect their nodes
            if (
              (!literalA.variable.equals(literalB.variable))
              || (literalA.valency === literalB.valency)
            ) {
              graph.addEdge(
                null,
                `cl_${i}_${literalA.variable}`,
                `cl_${j}_${literalB.variable}`
              )
            }
          }
        }
      }
    }

    this.output.graph.write(graph)
    this.output.cliqueSize.write(formula.clauses.length)
  }
}

export class CliqueToNodeCover extends APGBox {
  constructor () {
    super()
    this.newInputPlug('graph', this.compute)
    this.newInputPlug('cliqueSize', this.compute)
    this.newOutputPlug('graph')
    this.newOutputPlug('coverSize')
  }

  static metadata () {
    return {category: 'karp', name: 'clique_nodecover'}
  }

  compute () {
    let graph = this.input.graph.read()
    let cliqueSize = this.input.cliqueSize.read()

    if ((graph === null) || (cliqueSize === null)) {
      this.output.graph.write(null)
      this.output.coverSize.write(null)
      return
    }

    this.output.graph.write(graph.complemented())
    this.output.coverSize.write(graph.nodeCount() - cliqueSize)
  }
}
