import {APGBox} from '../box.js'
import {Graph} from '../data_structures/graph.js'

let cos = Math.cos
let sin = Math.sin
const PI = Math.PI

export class ThreeSatToDomSet extends APGBox {
  constructor () {
    super()
    this.newInputPlug('formula', this.compute)
    this.newOutputPlug('graph')
    this.newOutputPlug('target')
  }

  static metadata () {
    return {category: 'reductions', name: 'threesat_domset'}
  }

  compute () {
    let formula = this.input.formula.read()

    if (formula === null) {
      this.output.graph.write(null)
      this.output.target.write(null)
      return
    }

    let graph = new Graph()
    let dimensions = this._dimensions(formula)

    let cX = 500
    let cY = 500

    let n = formula.variables.length
    for (let [i, variable] of formula.variables.entries()) {
      let variable = formula.variables[i]
      let alpha = 2 * PI * (i / n)

      this._placeVariableGadget(
        graph.offset(
          cX + dimensions.varRingR * cos(alpha),
          cY + dimensions.varRingR * sin(alpha),
          dimensions.varScale,
          `var_${variable}_`,
          dimensions.rotateVariables ? alpha : 0
        ),
        variable
      )
    }

    let m = formula.clauses.length;
    for (let [i, clause] of formula.clauses.entries()) {
      graph.addNode(
        `clause_${i}`,
        cX + dimensions.clauseRingR * cos(2 * PI * i / m),
        cY + dimensions.clauseRingR * sin(2 * PI * i / m)
      )
      for (let literal of clause) {
        let val = literal.valency ? 't' : 'f'
        graph.addEdge(
          null,
          `clause_${i}`,
          `var_${literal.variable}_${val}_0`
        )
      }
    }

    this.output.graph.write(graph)
    this.output.target.write(this._computeSetSizeTarget(formula, graph))
  }

  _dimensions (formula) {
    let n = formula.variables.length
    let varScale = 20
    let varEdgeLength = 2 * varScale * sin(PI / 3)
    let varRingR = Math.max(100, varEdgeLength / (2 * sin(PI / (2 * n))))
    let clauseRingR = varRingR / 2
    return {
      varScale,
      varRingR,
      clauseRingR,
      rotateVariables: true
    }
  }

  _placeVariableGadget (graph, variable) {
    /* assumptions about this gadget:
       - the true domset consists of all nodes labeled t_* or a_*
       - the false domset consists of all nodes labeled f_* or a_*
       - the true domset and the false domset are both the same
       size, and there is no domset of the same size that contains both
       t_0 and f_0
       - further, these properties also hold if t_0 and/or f_0 are satisfied
       externally
    */
    let initialAngle = 0
    let third = 2 * PI / 3
    graph.addNode('dc', cos(initialAngle), sin(initialAngle))
      .addNode('t_0', cos(initialAngle + third), sin(initialAngle + third))
      .addNode('f_0', cos(initialAngle + 2 * third), sin(initialAngle + 2 * third))
      .addEdge(null, 't_0', 'f_0')
      .addEdge(null, 'f_0', 'dc')
      .addEdge(null, 'dc', 't_0')
  }

  _computeSetSizeTarget (formula, graph) {
    // TODO: this is quadratic in the number of variables, and it really
    // doesn't need to be
    let target = 0
    for (let variable of formula.variables) {
      variable = variable.toString()
      let trueNodes = 0
      let falseNodes = 0
      let alwaysNodes = 0
      for (let node of graph.nodes()) {
        if (node.startsWith(`var_${variable}_t_`)) {
          trueNodes++
        }

        if (node.startsWith(`var_${variable}_f_`)) {
          falseNodes++
        }

        if (node.startsWith(`var_${variable}_a_`)) {
          alwaysNodes++
        }
      }

      target += trueNodes + alwaysNodes
    }

    return target
  }
}
