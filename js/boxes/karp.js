import {APGBox} from '../box.js'
import {Variable, Literal, CNFFormula} from '../data_structures/cnf_formula.js'
import {Graph} from '../data_structures/graph.js'
import {assert} from '../utils/assert.js'
import {objectClone, enumerate} from '../utils/objects.js'

/* reduction in this file are taken from [Karp72]
   (see REFERENCES.md) */

export class SatToThreeSat extends APGBox {
  constructor () {
    super()
    this.newInputPlug('formula', this.updateFormula)
    this.newInputPlug('assignment', this.updateAssignment)
    this.newOutputPlug('formula')
    this.newOutputPlug('assignment')
    this.state = {extraVars: null}
  }

  static metadata () {
    return {category: 'karp', name: 'sat_threesat'}
  }

  updateFormula () {
    const original = this.input.formula.read()

    if (original === null) {
      this.output.formula.write(null)
      this.state.extraVars = null
      this.updateAssignment()
      return
    }

    let extraVarBase = 'a'
    // pick the subscript as (the max subscript used by an a-variable) + 1
    let extraVarSubscript = original.variables.reduce(
      (cur, v) => (v.base === extraVarBase) ? Math.max(cur, v.subscript + 1) : cur,
      0
    )

    let newVariables = objectClone(original.variables)
    this.state.extraVars = []
    let pickExtraVar = () => {
      let res = new Variable(extraVarBase, extraVarSubscript)
      extraVarSubscript++
      newVariables.push(res)
      this.state.extraVars[this.state.extraVars.length - 1].push(res)
      return res
    }

    let newClauses = []
    for (let [i, clause] of enumerate(original.clauses)) {
      this.state.extraVars.push([])

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
    this.updateAssignment()
  }

  updateAssignment () {
    const formula = this.input.formula.read()
    let assignment = this.input.assignment.copy()

    if ((this.state.extraVars === null) || (assignment === null)) {
      this.output.assignment.write(null)
      return
    }

    for (let [i, clause] of enumerate(formula.clauses)) {
      if (clause.length <= 3) {
        continue
      }

      let extraVars = this.state.extraVars[i]
      let satisfied = clause[0].satisfiedBy(assignment)
      for (let [j, v] of enumerate(extraVars)) {
        satisfied = satisfied || clause[j + 1].satisfiedBy(assignment)
        if (satisfied) {
          break
        }
        assignment.add(v.toString())
      }
    }

    this.output.assignment.write(assignment)
  }
}

export class SatToClique extends APGBox {
  constructor () {
    super()
    this.newInputPlug('formula', this.updateGraph)
    this.newInputPlug('assignment', this.updateAssignment)
    this.newOutputPlug('graph')
    this.newOutputPlug('cliqueSize')
    this.newOutputPlug('clique')
    this.state = {formula: null}
  }

  static metadata () {
    return {category: 'karp', name: 'sat_clique'}
  }

  updateGraph () {
    const original = this.input.formula.read()
    let formula = original.simplified()
    this.state.formula = formula

    if (formula === null) {
      this.output.graph.write(null)
      this.output.cliqueSize.write(null)
      this.updateAssignment()
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
        let varName = literal.variable.toString()
        let x = variablesNumbered.get(varName) * 30
        let y = i * 30
        // literals inside a clause are uniquely identified by their
        // variable names (since the formula is simplified)
        let nodeName = `cl_${i}_${varName}`
        graph.addNode(nodeName, x, y)
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

    this.updateAssignment()
  }

  updateAssignment () {
    const assignment = this.input.assignment.read()

    if ((this.state.formula === null) || (assignment === null)) {
      this.output.clique.write(null)
      return
    }

    let clique = new Set()
    for (let [i, clause] of enumerate(this.state.formula.clauses)) {
      // try to find a satisfied literal (just one) and take the corresponding node
      for (let literal of clause) {
        let varName = literal.variable.toString()
        if (assignment.has(varName) === literal.valency) {
          clique.add(`cl_${i}_${varName}`)
          break
        }
      }
    }

    this.output.clique.write(clique)
  }
}

export class CliqueToNodeCover extends APGBox {
  constructor () {
    super()
    this.newInputPlug('graph', this.updateGraph)
    this.newInputPlug('cliqueSize', this.updateCliqueSize)
    this.newInputPlug('clique', this.updateClique)
    this.newOutputPlug('graph')
    this.newOutputPlug('coverSize')
    this.newOutputPlug('nodeCover')
  }

  static metadata () {
    return {category: 'karp', name: 'clique_nodecover'}
  }

  updateGraph () {
    const graph = this.input.graph.read()
    let cliqueSize = this.input.cliqueSize.read()

    if (graph === null) {
      this.output.graph.write(null)
    } else {
      this.output.graph.write(graph.complemented())
    }

    this.updateCliqueSize()
    this.updateClique()
  }

  updateCliqueSize () {
    const graph = this.input.graph.read()
    let cliqueSize = this.input.cliqueSize.read()

    if ((graph === null) || (cliqueSize === null)) {
      this.output.coverSize.write(null)
    } else {
      this.output.coverSize.write(graph.nodeCount() - cliqueSize)
    }
  }

  updateClique () {
    const graph = this.input.graph.read()
    const clique = this.input.clique.read()

    if ((graph === null) || (clique === null)) {
      this.output.nodeCover.write(null)
      return
    }

    let nodeCover = new Set()
    for (let node of graph.nodes()) {
      if (!clique.has(node)) {
        nodeCover.add(node)
      }
    }
    this.output.nodeCover.write(nodeCover)
  }
}

export class NodeCoverToDirHamPath extends APGBox {
  constructor () {
    super()
    this.newInputPlug('graph', this.updateGraph)
    this.newInputPlug('coverSize', this.updateGraph)
    this.newInputPlug('nodeCover', this.updateCover)
    this.newOutputPlug('graph')
    this.newOutputPlug('path')
    this.state = {orderedEdges: null, transformedGraph: null}
  }

  static metadata () {
    return {category: 'karp', name: 'nodecover_dirhampath'}
  }

  updateGraph () {
    const original = this.input.graph.read()
    let coverSize = this.input.coverSize.read()

    if ((original === null) || (coverSize === null)) {
      this.output.graph.write(null)
      this.state.orderedEdges = null
      this.state.transformedGraph = null
      return
    }

    let origBounds = original.boundingBox()
    let graph = new Graph(true)
    let orderedEdges = new Map()

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
      orderedEdges.set(nodeName, edges)

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
      let edges = orderedEdges.get(nodeName)

      if (edges.length === 0) {
        continue
      }

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
    this.state.orderedEdges = orderedEdges
    this.state.transformedGraph = graph
    this.updateCover()
  }

  updateCover () {
    let cover = this.input.nodeCover.copy()
    let targetCoverSize = this.input.coverSize.read()

    if ((cover === null) || (this.state.orderedEdges === null)) {
      this.output.path.write(null)
      return
    }

    if (cover.size > targetCoverSize) {
      // cover too big, give up
      this.output.path.write([])
      return
    }

    if (cover.size < targetCoverSize) {
      // cover too small, pad
      for (let node of this.state.orderedEdges.keys()) {
        cover.add(node)
        if (cover.size === targetCoverSize) {
          break
        }
      }
    }

    let path = []
    let currentNode = 'a_0'

    let walkTo = (node => {
      let edgeName = this.state.transformedGraph.getEdgeBetween(currentNode, node)
      assert(edgeName !== null, `edge ${currentNode} → ${node} does not exist`)
      path.push(edgeName)
      currentNode = node
    })

    for (let [i, node] of enumerate(cover.values())) {
      let edges = this.state.orderedEdges.get(node)
      for (let {destName} of edges) {
        walkTo(`n_${node}_${destName}_enter`)
        if (!cover.has(destName)) {
          walkTo(`n_${destName}_${node}_enter`)
          walkTo(`n_${destName}_${node}_exit`)
        }
        walkTo(`n_${node}_${destName}_exit`)
      }
      if (i < targetCoverSize - 1) {
        walkTo(`a_${i + 1}`)
      }
    }

    this.output.path.write(path)
  }
}
