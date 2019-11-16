export var BoxCategories = new Map()
export var BoxIndex = new Map()

import {Hold} from './data_flow.js'
registerBox(Hold)

import {Spinner} from './primitive_io.js'
registerBox(Spinner)

import {STInitializer, STUpdater, STVisualizer} from './segment_tree.js'
registerBox(STInitializer)
registerBox(STUpdater)
registerBox(STVisualizer)

function registerBox(box) {
  let meta = box.metadata()
  if (!BoxCategories.has(meta.category)) {
    BoxCategories.set(meta.category, [])
  }
  BoxCategories.get(meta.category).push(box)

  BoxIndex.set(box._typeId(), box)
}
