// assumes d3.js is imported
import {APGProgram} from './program.js'

import {BoxList} from './ui/boxlist.js'
import {ProgramView} from './ui/programview.js'
import {Toolbar} from './ui/toolbar.js'

export class APG {
  constructor (root) {
    this.root = d3.select(root)

    this._program = null
    let savedProgram = window.localStorage.program
    if (savedProgram === undefined) {
      this.newProgram()
    } else {
      try {
        this.loadProgram(savedProgram)
      } catch (e) {
        console.error('error while loading saved program:', e)
        this.newProgram()
      }
    }

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

  setProgram (program) {
    if (this._program !== null) {
      this._program.attachToUi(null)
    }
    this._program = program
    this._program.attachToUi(this)
    this.programView && this.programView.newProgramLoaded()
  }

  newProgram () {
    this.setProgram(new APGProgram())
  }

  loadProgram (serialized) {
    this.setProgram(APGProgram.load(serialized))
  }

  saveProgram () {
    this._program._viewParams = this.programView.getParams()
    window.localStorage.program = this._program.save()
  }
}
