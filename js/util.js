import {APGData} from './data.js'

export function generateUnusedKey(dict, prefix) {
	// is there a fast way to get the number of keys in an object?
	// Object.keys(dict).length appears to be linear-time, so there's no
	// use in trying to use it to make this faster.
	for (let i = 0; ; i++) {
		if (!dict.hasOwnProperty(`${prefix}_${i}`)) {
			return `${prefix}_${i}`
		}
	}
}

export function objectsEqual(left, right) {
	// TODO: does this work for String, Boolean, Number objects?
	// TODO: fast path for when (left === right)? not sure if that ever comes up
	if (
		(left === null)
		|| (typeof left === 'boolean')
		|| (typeof left === 'string')
	) {
		return left === right
	} else if (typeof left === 'number') {
		// numbers need special treatment to get NaN to compare equal to itself
		return (left === right) || (isNaN(left) && (typeof right === 'number') && isNaN(right))
	} else if (typeof left === 'object') {
		if (Array.isArray(left)) {
			return (
				Array.isArray(right)
				&& (left.length == right.length)
				&& (left.map((l, i) => objectsEqual(l, right[i])))
			)
		} else if (left.constructor === Object) {
			// this is an object that is not an instance of anything interesting
			throw new Error('not implemented')
		} else if (left instanceof APGData) {
			return (
				(right instanceof APGData)
				&& (left.constructor === right.constructor)
				&& left.equals(right)
			)
		} else {
			throw new Error(`tried to compare incomparable objects ${left} and ${right}`)
		}
	}
}

export function objectClone(obj) {
	// TODO: does this work for String, Boolean, Number objects?
	if (
		(obj === null)
		|| (typeof obj === 'boolean')
		|| (typeof obj === 'string')
		|| (typeof obj === 'number')
	) {
		// these are immutable, so no need to actually clone them
		return obj
	} else if (typeof obj === 'object') {
		if (Array.isArray(obj)) {
			return obj.map(objectClone)
		} else if (obj.constructor === Object) {
			// this is an object that is not an instance of anything interesting
			throw new Error('not implemented')
		} else if (obj instanceof APGData) {
			return obj.clone()
		} else {
			throw new Error(`tried to clone uncloneable object ${obj}`)
		}
	}
}

export function objectFreeze(obj) {
	// TODO: does this work for String, Boolean, Number objects?
	if (
		(obj === null)
		|| (typeof obj === 'boolean')
		|| (typeof obj === 'string')
		|| (typeof obj === 'number')
	) {
		// these are immutable, so no need to actually freeze them
		return obj
	} else if (typeof obj === 'object') {
		if (Array.isArray(obj) || (obj.constructor === Object)) {
			// either an array or a plain object, Object.freeze works on both
			return Object.freeze(obj)
		} else if (obj instanceof APGData) {
			return obj.clone()
		} else {
			throw new Error(`tried to freeze unfreezeable object ${obj}`)
		}
	}
}
