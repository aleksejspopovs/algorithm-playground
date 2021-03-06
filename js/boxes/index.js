export var BoxCategories = new Map()
export var BoxIndex = new Map()

import {Hold} from './data_flow.js'
registerBox(Hold)

import {Spinner, ToString} from './primitive_io.js'
registerBox(Spinner)
registerBox(ToString)

import {STInitializer, STUpdater} from './segment_tree.js'
registerBox(STInitializer)
registerBox(STUpdater)

import {Graph, ExampleGraph, SetsToColors} from './graph.js'
registerBox(Graph)
registerBox(ExampleGraph)
registerBox(SetsToColors)

import {CNFFormula, Assignment} from './cnf_formula.js'
registerBox(CNFFormula)
registerBox(Assignment)

import {SatToDomSet} from './sat_to_domset.js'
registerBox(SatToDomSet)

import {SlowComputation, AwaitCounter} from './debug.js'
registerBox(SlowComputation)
registerBox(AwaitCounter)

import {Add, Mul} from './arithmetic.js'
registerBox(Add)
registerBox(Mul)

import {SatToThreeSat, SatToClique, CliqueToNodeCover, NodeCoverToDirHamPath} from './karp.js'
registerBox(SatToThreeSat)
registerBox(SatToClique)
registerBox(CliqueToNodeCover)
registerBox(NodeCoverToDirHamPath)

import {ThreeSatToThreeColor, ThreeColorPlanarize} from './threesat_to_threecolor.js'
registerBox(ThreeSatToThreeColor)
registerBox(ThreeColorPlanarize)

function registerBox(box) {
  let meta = box.metadata()
  if (!BoxCategories.has(meta.category)) {
    BoxCategories.set(meta.category, [])
  }
  BoxCategories.get(meta.category).push(box)

  BoxIndex.set(box._typeId(), box)
}
