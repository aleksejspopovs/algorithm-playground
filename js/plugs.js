import {objectClone, objectFreeze, objectsEqual} from './utils/objects.js'

export class APGInputPlug {
  constructor (name, box, updateHandler) {
    this.name = name
    this.updateHandler = updateHandler
    this._value = null
    this._box = box
  }

  _write (value, yieldControl) {
    // internal method.
    // assumes that value comes in frozen, copied.
    if (!this._box._isProcessing) {
      throw new Error('cannot update input plugs when box is not in processing mode')
    }

    this._value = value
    if (this.updateHandler) {
      return this.updateHandler.call(this._box, yieldControl)
    }
  }

  read () {
    if (!this._box._isProcessing) {
      throw new Error('cannot read input plugs when box is not in processing mode')
    }

    return this._value
  }

  copy () {
    if (!this._box._isProcessing) {
      throw new Error('cannot read input plugs when box is not in processing mode')
    }

    return objectClone(this._value)
  }
}

export class APGOutputPlug {
  constructor (name, box) {
    this.name = name
    this._value = null
    this._box = box
  }

  write (value) {
    if (!this._box._isProcessing) {
      throw new Error('cannot write into output plugs when box is not in processing mode')
    }

    if (objectsEqual(this._value, value)) {
      // skip update because the value has not changed
      return
    }

    this._value = objectFreeze(objectClone(value))
    this._box._program.schedulePlugUpdatesFrom(this._box._id, this.name, this._value)
  }
}
