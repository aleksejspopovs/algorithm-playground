export class Queue {
  constructor () {
    this._store = []
    this._index = 0
  }

  push (element) {
    this._store.push(element)
  }

  pop () {
    if (this._store._index >= this._store.length) {
      throw new Error('popping an empty queue')
    }

    let result = this._store[this._index++]

    if (this._index * 2 >= this._store.length) {
      // if more than half of the items stored in queue have been popped,
      // rebuild the queue, getting rid of them.
      // (this gives amortized O(1) pops.)
      this._store = this._store.slice(this._index)
      this._index = 0
    }

    return result
  }

  peek () {
    if (this._index >= this._store.length) {
      throw new Error('peeking an empty queue')
    }

    return this._store[this._index]
  }

  empty () {
    return this._index === this._store.length
  }
}
