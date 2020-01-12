// assumes d3.js is imported
import {APGProgram} from './program.js'

import {BoxList} from './ui/boxlist.js'
import {ProgramView} from './ui/programview.js'
import {Toolbar} from './ui/toolbar.js'

export class APG {
  constructor (root) {
    this.root = d3.select(root)

    let savedProgram = window.localStorage.program
    if (savedProgram === undefined) {
      this._program = new APGProgram()
    } else {
      this._program = APGProgram.load(savedProgram)
    }
    this._program.attachToUi(this)

    let getProgram = () => {
      return this._program
    }

    let modifyProgram = (f) => {
      f(this._program)
      this.saveProgram()
    }

    let programRoot = this.root.append('div')
    this.programView = new ProgramView(programRoot, getProgram, modifyProgram)

    let boxListRoot = this.root.append('div')
    this.boxList = new BoxList(boxListRoot, getProgram, modifyProgram)

    let toolbarRoot = this.root.append('div')
    this.toolbar = new Toolbar(toolbarRoot, this)

    d3.select('body')
        .on('keypress', () => {
          if (d3.event.code === 'KeyQ') {
            this.boxList.toggleVisibility()
          }
        })
  }

  refreshBox (id) {
    this.programView.refreshBox(id)
  }

  refreshProgramStructure () {
    this.programView.refreshStructure()
  }

  startBoxProcessing (id) {
    this.programView.startBoxProcessing(id)
  }

  finishBoxProcessing (id, error) {
    this.programView.finishBoxProcessing(id, error)
  }

  flashWireActivity (id) {
    this.programView.flashWireActivity(id)
  }

  saveProgram () {
    window.localStorage.program = this._program.save()
  }
}
