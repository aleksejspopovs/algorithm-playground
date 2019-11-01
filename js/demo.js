import {APG} from './apg.js'
import {Spinner} from './boxes/primitive_io.js'
import {Hold} from './boxes/data_flow.js'
import {STInitializer, STUpdater, STVisualizer} from './boxes/segment_tree.js'

let apg = new APG(document.body)
apg._program.addBox(new STInitializer(), 'initializer', 403, 41)
apg._program.addBox(new STVisualizer(), 'visualizer', 505, 547)
apg._program.addBox(new STUpdater(), 'updater', 399, 325)
apg._program.addBox(new Spinner(), 'index', 249, 189)
apg._program.addBox(new Spinner(), 'value', 447, 187)
apg._program.addBox(new Hold(), 'hold', 338, 544)

apg._program.addWire('initializer', 'tree', 'updater', 'tree')
apg._program.addWire('hold', 'value', 'updater', 'tree')
apg._program.addWire('index', 'value', 'updater', 'index')
apg._program.addWire('value', 'value', 'updater', 'value')
apg._program.addWire('updater', 'tree', 'visualizer', 'tree')
apg._program.addWire('updater', 'tree', 'hold', 'held')
