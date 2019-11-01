import {APG} from './apg.js'
import {Spinner} from './boxes/primitive_io.js'
import {Hold} from './boxes/data_flow.js'
import {STInitializer, STUpdater, STVisualizer} from './boxes/segment_tree.js'

let apg = new APG(document.body)
apg._program.addBox(new STInitializer(), 'initializer')
apg._program.addBox(new STVisualizer(), 'visualizer')
apg._program.addBox(new STUpdater(), 'updater')
apg._program.addBox(new Spinner(), 'index')
apg._program.addBox(new Spinner(), 'value')
apg._program.addBox(new Hold(), 'hold')

apg._program.addWire('initializer', 'tree', 'updater', 'tree')
apg._program.addWire('hold', 'value', 'updater', 'tree')
apg._program.addWire('index', 'value', 'updater', 'index')
apg._program.addWire('value', 'value', 'updater', 'value')
apg._program.addWire('updater', 'tree', 'visualizer', 'tree')
apg._program.addWire('updater', 'tree', 'hold', 'held')
