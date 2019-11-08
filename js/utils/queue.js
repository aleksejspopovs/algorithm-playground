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

  empty () {
    return this._index === this._store.length
  }
}


export class TwoPriorityQueue {
  constructor () {
    this._queues = [new Queue(), new Queue()]
  }

  pushRegular (element) {
    this._queues[1].push(element)
  }

  pushPrioritized (element) {
    this._queues[0].push(element)
  }

  pop () {
    if (!this._queues[0].empty()) {
      return this._queues[0].pop()
    } else if (!this._queues[1].empty()) {
      return this._queues[1].pop()
    } else {
      throw new Error('popping an empty queue')
    }
  }

  empty () {
    return this._queues.every((q) => q.empty())
  }
}
