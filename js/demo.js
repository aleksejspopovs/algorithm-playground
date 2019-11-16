import {APG} from './apg.js'
import {Spinner} from './boxes/primitive_io.js'
import {Hold} from './boxes/data_flow.js'
import {STInitializer, STUpdater, STVisualizer} from './boxes/segment_tree.js'

if (!window.localStorage.program) {
  window.localStorage.program = (
      '{"boxes":[{"id":"initializer","x":403,"y":41,"type":"segment_tree.initializer"},{"'
    + 'id":"visualizer","x":505,"y":547,"type":"segment_tree.visualizer"},{"id":"updater"'
    + ',"x":399,"y":325,"type":"segment_tree.updater"},{"id":"index","x":249,"y":189,"typ'
    + 'e":"primitive_io.spinner"},{"id":"value","x":558,"y":159,"type":"primitive_io.spin'
    + 'ner"},{"id":"hold","x":338,"y":544,"type":"data_flow.hold"}],"wires":[{"id":"wire_'
    + '0","srcBox":"initializer","srcPlug":"tree","destBox":"updater","destPlug":"tree"},'
    + '{"id":"wire_1","srcBox":"hold","srcPlug":"value","destBox":"updater","destPlug":"t'
    + 'ree"},{"id":"wire_2","srcBox":"index","srcPlug":"value","destBox":"updater","destP'
    + 'lug":"index"},{"id":"wire_3","srcBox":"value","srcPlug":"value","destBox":"updater'
    + '","destPlug":"value"},{"id":"wire_4","srcBox":"updater","srcPlug":"tree","destBox"'
    + ':"visualizer","destPlug":"tree"},{"id":"wire_5","srcBox":"updater","srcPlug":"tree'
    + '","destBox":"hold","destPlug":"held"}]}'
  )
}

let apg = new APG(document.body)
