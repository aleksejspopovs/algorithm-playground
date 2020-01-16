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

import {Graph, ExampleGraph} from './graph.js'
registerBox(Graph)
registerBox(ExampleGraph)

import {Formula} from './formula.js'
registerBox(Formula)

import {ThreeSatToDomSet} from './threesat_to_domset.js'
registerBox(ThreeSatToDomSet)

import {SlowComputation, AwaitCounter} from './debug.js'
registerBox(SlowComputation)
registerBox(AwaitCounter)

import {Add, Mul} from './arithmetic.js'
registerBox(Add)
registerBox(Mul)

function registerBox(box) {
  let meta = box.metadata()
  if (!BoxCategories.has(meta.category)) {
    BoxCategories.set(meta.category, [])
  }
  BoxCategories.get(meta.category).push(box)

  BoxIndex.set(box._typeId(), box)
}
