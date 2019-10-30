import {APG} from './apg.js'
import {Spinner} from './objects/primitive_io.js'
import {Hold} from './objects/data_flow.js'
import {STInitializer, STUpdater, STVisualizer} from './objects/segment_tree.js'

let apg = new APG(document.body)
apg._program.addObject(new STInitializer(), 'initializer')
apg._program.addObject(new STVisualizer(), 'visualizer')
apg._program.addObject(new STUpdater(), 'updater')
apg._program.addObject(new Spinner(), 'index')
apg._program.addObject(new Spinner(), 'value')
apg._program.addObject(new Hold(), 'hold')

apg._program.addWire('initializer', 'tree', 'updater', 'tree')
apg._program.addWire('hold', 'value', 'updater', 'tree')
apg._program.addWire('index', 'value', 'updater', 'index')
apg._program.addWire('value', 'value', 'updater', 'value')
apg._program.addWire('updater', 'tree', 'visualizer', 'tree')
apg._program.addWire('updater', 'tree', 'hold', 'held')
