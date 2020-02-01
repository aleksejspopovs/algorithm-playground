import {APGBox} from '../box.js'
import {Graph} from '../data_structures/graph.js'
import {enumerate} from '../utils/objects.js'

export class ThreeSatToThreeColor extends APGBox {
  constructor () {
    super()
    this.newInputPlug('formula', this.compute)
    this.newOutputPlug('graph')
  }

  static metadata () {
    return {category: 'reductions', name: 'threesat_threecolor'}
  }

  compute () {
    const formula = this.input.formula.read()

    if (formula === null) {
      this.output.graph.write(null)
      return
    }

    if (!formula.degreeExactly(3)) {
      throw new Error('formula must be strictly 3CNF')
    }

    let graph = new Graph()

    let varRadius = 70
    let tfRadius = 110
    let clauseInnerRadius = 150
    let clauseOuterRadius = 200

    graph.addNode('dc', 0, 0)

    let varAngle = 2 * Math.PI / ((formula.variables.length + 1) * 2)
    graph.addNode('t', tfRadius * Math.cos(0), tfRadius * Math.sin(0))
         .addNode('f', tfRadius * Math.cos(varAngle), tfRadius * Math.sin(varAngle))
         .addEdge(null, 'dc', 't')
         .addEdge(null, 'dc', 'f')
         .addEdge(null, 't', 'f')

    for (let [i, v] of enumerate(formula.variables)) {
      graph.addNode(
        `pos_${v}`,
        varRadius * Math.cos((2 + 2 * i) * varAngle),
        varRadius * Math.sin((2 + 2 * i) * varAngle),
      ).addNode(
        `neg_${v}`,
        varRadius * Math.cos((2 + 2 * i + 1) * varAngle),
        varRadius * Math.sin((2 + 2 * i + 1) * varAngle),
      ).addEdge(null, `pos_${v}`, `neg_${v}`)
       .addEdge(null, 'dc', `pos_${v}`)
       .addEdge(null, 'dc', `neg_${v}`)
    }

    if (formula.clauses.length === 0) {
      this.output.graph.write(graph)
      return
    }

    let clauseAngle = 2 * Math.PI / (4 * formula.clauses.length)
    for (let [i, clause] of enumerate(formula.clauses)) {
      graph.addNode(
        `cl_${i}_innerL`,
        clauseInnerRadius * Math.cos((4 * i) * clauseAngle),
        clauseInnerRadius * Math.sin((4 * i) * clauseAngle),
      ).addNode(
        `cl_${i}_innerR`,
        clauseInnerRadius * Math.cos((4 * i + 1) * clauseAngle),
        clauseInnerRadius * Math.sin((4 * i + 1) * clauseAngle),
      ).addNode(
        `cl_${i}_inner`,
        clauseOuterRadius * Math.cos((4 * i + 1/2) * clauseAngle),
        clauseOuterRadius * Math.sin((4 * i + 1/2) * clauseAngle),
      ).addEdge(null, `cl_${i}_innerL`, `cl_${i}_innerR`)
       .addEdge(null, `cl_${i}_innerL`, `cl_${i}_inner`)
       .addEdge(null, `cl_${i}_innerR`, `cl_${i}_inner`)
       .addEdge(null, `cl_${i}_innerL`, (clause[0].valency ? 'pos' : 'neg') + '_' + clause[0].variable)
       .addEdge(null, `cl_${i}_innerR`, (clause[1].valency ? 'pos' : 'neg') + '_' + clause[1].variable)

      graph.addNode(
        `cl_${i}_outerL`,
        clauseOuterRadius * Math.cos((4 * i + 5/2) * clauseAngle),
        clauseOuterRadius * Math.sin((4 * i + 5/2) * clauseAngle),
      ).addNode(
        `cl_${i}_outerR`,
        clauseInnerRadius * Math.cos((4 * i + 3) * clauseAngle),
        clauseInnerRadius * Math.sin((4 * i + 3) * clauseAngle),
      ).addNode(
        `cl_${i}_outer`,
        clauseInnerRadius * Math.cos((4 * i + 2) * clauseAngle),
        clauseInnerRadius * Math.sin((4 * i + 2) * clauseAngle),
      ).addEdge(null, `cl_${i}_outerL`, `cl_${i}_outerR`)
       .addEdge(null, `cl_${i}_outerL`, `cl_${i}_outer`)
       .addEdge(null, `cl_${i}_outerR`, `cl_${i}_outer`)
       .addEdge(null, `cl_${i}_outerL`, `cl_${i}_inner`)
       .addEdge(null, `cl_${i}_outerR`, (clause[2].valency ? 'pos' : 'neg') + '_' + clause[2].variable)
       .addEdge(null, `cl_${i}_outer`, 'f')
       .addEdge(null, `cl_${i}_outer`, 'dc')
    }

    this.output.graph.write(graph)
  }
}

export class ThreeColorPlanarize extends APGBox {
  constructor () {
    super()
    this.newInputPlug('graph', this.compute)
    this.newOutputPlug('graph')
  }

  static metadata () {
    return {category: 'reductions', name: 'threecolor_planarize'}
  }

  compute () {
    // TODO: repeat until planar
    let graph = this.input.graph.copy()

    if (graph === null) {
      this.output.graph.write(null)
      return
    }

    let intersections = graph.computeEdgeIntersections()

    if (intersections.length === 0) {
      this.output.graph.write(graph)
      return
    }

    let distSq = (x1, y1, x2, y2) => (x1-x2) * (x1-x2) + (y1-y2) * (y1-y2)
    let xingsOnEdge = new Map()

    let startIndex = 0
    // TODO: this is a little naive and only works if the only collisions
    // we are worried about are from previous applications of this box.
    // should replace this with something smarter (like adding a prefix to
    // all pre-existing nodes)
    while (graph.hasNode(`x_${startIndex}_tl`)) {
      startIndex++
    }

    for (let [i, xing] of enumerate(intersections, startIndex)) {
      // TODO: yielding

      // find how big we can make this gadget
      // what's the closest other vertex or intersection point?
      // TODO: performance
      let minDistSq = parseFloat('Infinity')
      for (let nodeName of graph.nodes()) {
        let node = graph.getNode(nodeName)
        minDistSq = Math.min(minDistSq, distSq(xing.x, xing.y, node.x, node.y))
      }

      for (let [j, {x, y}] of enumerate(intersections)) {
        if (j == i) {
          continue
        }
        minDistSq = Math.min(minDistSq, distSq(xing.x, xing.y, x, y))
      }
      let minDist = Math.sqrt(minDistSq)

      let edgeA = graph.getEdge(xing.edgeNameA)
      let edgeB = graph.getEdge(xing.edgeNameB)

      let radius = minDist / 3
      let side = (Math.SQRT2 * radius) / 2

      // find vectors representing edges and renormalize them to be
      // `side` units long
      let adx = graph.getNode(edgeA.to).x - graph.getNode(edgeA.from).x
      let ady = graph.getNode(edgeA.to).y - graph.getNode(edgeA.from).y
      let alen = Math.sqrt(adx*adx + ady*ady)
      adx *= side / alen
      ady *= side / alen
      let bdx = graph.getNode(edgeB.to).x - graph.getNode(edgeB.from).x
      let bdy = graph.getNode(edgeB.to).y - graph.getNode(edgeB.from).y
      let blen = Math.sqrt(bdx*bdx + bdy*bdy)
      bdx *= side / blen
      bdy *= side / blen

      graph.addNode(`x_${i}_tl`, xing.x - adx - bdx, xing.y - ady - bdy)
           .addNode(`x_${i}_tc`, xing.x - bdx, xing.y - bdy)
           .addNode(`x_${i}_tr`, xing.x + adx - bdx, xing.y + ady - bdy)
           .addNode(`x_${i}_cl`, xing.x - adx, xing.y - ady)
           .addNode(`x_${i}_cc`, xing.x, xing.y)
           .addNode(`x_${i}_cr`, xing.x + adx, xing.y + ady)
           .addNode(`x_${i}_bl`, xing.x - adx + bdx, xing.y - ady + bdy)
           .addNode(`x_${i}_bc`, xing.x + bdx, xing.y + bdy)
           .addNode(`x_${i}_br`, xing.x + adx + bdx, xing.y + ady + bdy)
           .addNode(`x_${i}_afrom_cp`, xing.x + 2 * adx, xing.y + 2 * ady)
           .addNode(`x_${i}_bfrom_cp`, xing.x + 2 * bdx, xing.y + 2 * bdy)
           .addEdge(`x_${i}_tl`, `x_${i}_tc`)
           .addEdge(`x_${i}_cl`, `x_${i}_cc`).addEdge(`x_${i}_cc`, `x_${i}_cr`)
           .addEdge(`x_${i}_bc`, `x_${i}_br`)
           .addEdge(`x_${i}_cl`, `x_${i}_bl`)
           .addEdge(`x_${i}_tc`, `x_${i}_cc`).addEdge(`x_${i}_cc`, `x_${i}_bc`)
           .addEdge(`x_${i}_tr`, `x_${i}_cr`)
           .addEdge(`x_${i}_cl`, `x_${i}_tc`).addEdge(`x_${i}_tc`, `x_${i}_cr`)
           .addEdge(`x_${i}_cr`, `x_${i}_bc`).addEdge(`x_${i}_bc`, `x_${i}_cl`)
           .addEdge(`x_${i}_tr`, `x_${i}_afrom_cp`)
           .addEdge(`x_${i}_cr`, `x_${i}_afrom_cp`)
           .addEdge(`x_${i}_br`, `x_${i}_afrom_cp`)
           .addEdge(`x_${i}_bl`, `x_${i}_bfrom_cp`)
           .addEdge(`x_${i}_bc`, `x_${i}_bfrom_cp`)
           .addEdge(`x_${i}_br`, `x_${i}_bfrom_cp`)

      if (!xingsOnEdge.has(edgeA.name)) {
        xingsOnEdge.set(edgeA.name, [])
      }
      xingsOnEdge.get(edgeA.name).push({
        l: [`x_${i}_tl`, `x_${i}_cl`, `x_${i}_bl`],
        r: `x_${i}_afrom_cp`,
        t: xing.timeA,
      })

      if (!xingsOnEdge.has(edgeB.name)) {
        xingsOnEdge.set(edgeB.name, [])
      }
      xingsOnEdge.get(edgeB.name).push({
        l: [`x_${i}_tl`, `x_${i}_tc`, `x_${i}_tr`],
        r: `x_${i}_bfrom_cp`,
        t: xing.timeB,
      })
    }

    for (let [edgeName, xings] of xingsOnEdge.entries()) {
      let edge = graph.getEdge(edgeName)
      graph.deleteEdge(edgeName)

      xings.sort((a, b) => (a.t - b.t))
      let cur = edge.from
      for (let {l, r} of xings) {
        for (let v of l) {
          graph.addEdge(cur, v)
        }
        cur = r
      }
      graph.addEdge(cur, edge.to)
    }

    this.output.graph.write(graph)
  }
}
