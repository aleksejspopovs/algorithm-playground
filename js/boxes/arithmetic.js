import {APGBox} from '../box.js'

export class Add extends APGBox {
  constructor () {
    super()
    this.newInputPlug('a', this.recompute)
    this.newInputPlug('b', this.recompute)
    this.newOutputPlug('result')
  }

  static metadata () {
    return {category: 'arithmetic', name: 'add'}
  }

  recompute (yieldControl) {
    let a = this.input.a.read()
    let b = this.input.b.read()
    this.output.result.write(a + b)
  }
}

export class Mul extends APGBox {
  constructor () {
    super()
    this.newInputPlug('a', this.recompute)
    this.newInputPlug('b', this.recompute)
    this.newOutputPlug('result')
  }

  static metadata () {
    return {category: 'arithmetic', name: 'mul'}
  }

  recompute (yieldControl) {
    let a = this.input.a.read()
    let b = this.input.b.read()
    this.output.result.write(a * b)
  }
}
