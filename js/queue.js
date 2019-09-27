export class Queue {
	constructor () {
		this._store = []
		this._index = 0
		// TODO: actually delete elements when they are popped
	}

	push (element) {
		this._store.push(element)
	}

	pop () {
		if (this._store._index >= this._store.length) {
			throw new Error('popping an empty queue')
		}
		return this._store[this._index++]
	}

	empty () {
		return this._index === this._store.length
	}
}


// TODO: real priority queue?
export class PriorityQueue {
	constructor () {
		this._queues = [new Queue(), new Queue()]
	}

	push (element, priority) {
		this._queues[priority - 1].push(element)
	}

	pop () {
		if (!this._queues[1].empty()) {
			return this._queues[1].pop()
		} else if (!this._queues[0].empty()) {
			return this._queues[0].pop()
		} else {
			throw new Error('popping an empty queue')
		}
	}

	empty () {
		return this._queues.every((q) => q.empty())
	}
}
