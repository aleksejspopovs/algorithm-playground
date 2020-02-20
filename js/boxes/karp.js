import {APGBox} from '../box.js'
import {Variable, Literal, CNFFormula} from '../data_structures/cnf_formula.js'
import {Graph} from '../data_structures/graph.js'
import {objectClone, enumerate} from '../utils/objects.js'

/* reduction in this file are taken from [Karp72]
   (see REFERENCES.md) */

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
      for (let literal of clause) {
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
    const graph = this.input.graph.read()
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

export class NodeCoverToDirHamPath extends APGBox {
  constructor () {
    super()
    this.newInputPlug('graph', this.compute)
    this.newInputPlug('coverSize', this.compute)
    this.newOutputPlug('graph')
  }

  static metadata () {
    return {category: 'karp', name: 'nodecover_dirhampath'}
  }

  compute () {
    let original = this.input.graph.read()
    let coverSize = this.input.coverSize.read()

    if ((original === null) || (coverSize === null)) {
      this.output.graph.write(null)
      return
    }

    let origBounds = original.boundingBox()
    let graph = new Graph(true)
    let processedEdges = new Map()

    for (let nodeName of original.nodes()) {
      let node = original.getNode(nodeName)
      let edges = Array.from(
        original.edgesFrom(nodeName),
        edgeName => {
          let edge = original.getEdge(edgeName)
          let destName = edge.other(nodeName)
          let dest = original.getNode(destName)
          let angle = Math.atan2(dest.y - node.y, dest.x - node.x)
          return {destName, angle}
        }
      ).sort((x, y) => x.angle - y.angle)
      processedEdges.set(nodeName, edges)

      for (let {destName, angle} of edges) {
        graph.addNode(
          `n_${nodeName}_${destName}_enter`,
          (node.x - origBounds.x1) * 10 + 10 * Math.cos(angle - 0.08),
          (node.y - origBounds.y1) * 10 + 10 * Math.sin(angle - 0.08),
        )
        graph.addNode(
          `n_${nodeName}_${destName}_exit`,
          (node.x - origBounds.x1) * 10 + 10 * Math.cos(angle + 0.08),
          (node.y - origBounds.y1) * 10 + 10 * Math.sin(angle + 0.08),
        )
      }
    }

    let stepSize = (coverSize > 1) ? 1 / (coverSize - 1) : 0
    for (let i = 0; i < coverSize; i++) {
      graph.addNode(
        `a_${i}`,
        -100,
        10 * (origBounds.y2 - origBounds.y1) * i * stepSize
      )
    }

     for (let nodeName of original.nodes()) {
      let edges = processedEdges.get(nodeName)

      for (let [i, {destName}] of enumerate(edges)) {
        graph.addEdge(`n_${nodeName}_${destName}_enter`, `n_${nodeName}_${destName}_exit`)

        graph.addEdge(`n_${nodeName}_${destName}_enter`, `n_${destName}_${nodeName}_enter`)
        graph.addEdge(`n_${nodeName}_${destName}_exit`, `n_${destName}_${nodeName}_exit`)

        if (i !== edges.length - 1) {
          let nextDestName = edges[i + 1].destName
          graph.addEdge(`n_${nodeName}_${destName}_exit`, `n_${nodeName}_${nextDestName}_enter`)
        }
      }

      let firstDest = edges[0].destName
      let lastDest = edges[edges.length - 1].destName
      for (let i = 0; i < coverSize; i++) {
        graph.addEdge(`a_${i}`, `n_${nodeName}_${firstDest}_enter`)
        graph.addEdge(`n_${nodeName}_${lastDest}_exit`, `a_${i}`)
      }
    }

    this.output.graph.write(graph)
  }
}
