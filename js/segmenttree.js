import {APGData} from './data.js'
import {objectsEqual, objectClone, objectFreeze} from './util.js'

export class SegmentTree extends APGData {
	constructor (l, r) {
		super()
		this._l = l
		this._r = r
		this._lchild = null
		this._rchild = null
		this._sum = 0
	}

	equals (other) {
		return (
			(this._l === other._l)
			&& (this._r === other._r)
			&& (this._sum === other._sum)
			&& objectsEqual(this._lchild, other._lchild)
			&& objectsEqual(this._rchild, other._rchild)
		)
	}

	clone () {
		let result = new SegmentTree(this._l, this._r)
		result._sum = this._sum
		result._lchild = objectClone(this._lchild)
		result._rchild = objectClone(this._rchild)
		return result
	}

	freeze () {
		objectFreeze(this._lchild)
		objectFreeze(this._rchild)
		Object.freeze(this)
	}

	isLeaf () {
		return this._l === this._r
	}

	mid () {
		// TODO: assumes positive bounds
		return Math.floor((this._l + this._r) / 2)
	}

	sum (l, r) {
		if ((l === this._l) && (r === this._r)) {
			return this._sum
		}
		if ((l < this._l) || (r > this._r)) {
			throw new Error('segment tree queried on interval not in it')
		}

		let mid = this.mid()
		let result = 0
		if ((l <= mid) && (this._lchild !== null)) {
			result += this._lchild.sum(l, Math.min(mid, r))
		}
		if ((r > mid) && (this._rchild !== null)) {
			result += this._rchild.sum(Math.max(l, mid + 1), r)
		}

		return result
	}

	set (index, value) {
		if ((index < this._l) || (index > this._r)) {
			throw new Error('segment tree updated on point not in it')
		}

		if (this.isLeaf()) {
			this._sum = value
			return
		}

		let mid = this.mid()
		if (index <= mid) {
			if (this._lchild === null) {
				this._lchild = new SegmentTree(this._l, mid)
			}
			this._lchild.set(index, value)
		} else {
			if (this._rchild === null) {
				this._rchild = new SegmentTree(mid + 1, this._r)
			}
			this._rchild.set(index, value)
		}

		this.recomputeSum()
	}

	recomputeSum() {
		this._sum = (
			  ((this._lchild !== null) ? this._lchild._sum : 0)
			+ ((this._rchild !== null) ? this._rchild._sum : 0)
		)
	}

	toLines() {
		let result = [`- ${this._l} -- ${this._r} (${this._sum})`]
		if (this.isLeaf()) {
			return result
		}

		if (this._lchild !== null) {
			result = result.concat(this._lchild.toLines().map((x) => '  ' + x))
		} else {
			result.push('  - none')
		}
		if (this._rchild !== null) {
			result = result.concat(this._rchild.toLines().map((x) => '  ' + x))
		} else {
			result.push('  - none')
		}
		return result
	}

	toString () {
		return this.toLines().join('\n')
	}
}
