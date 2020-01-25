import {APGData} from '../data.js'

export function generateUnusedKey(map, prefix) {
  for (let i = map.size; ; i++) {
    if (!map.has(`${prefix}_${i}`)) {
      return `${prefix}_${i}`
    }
  }
}

function iteratorsEqual(left, right) {
  while (true) {
    let leftValue = left.next()
    let rightValue = right.next()
    if (leftValue.done) {
      return rightValue.done
    } else if (!objectsEqual(leftValue.value, rightValue.value)) {
      return false
    }
  }
}

export function* enumerate(iterator, start=0) {
  let i = 0
  for (let item of iterator) {
    yield [i++, item]
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
        && (left.every((l, i) => objectsEqual(l, right[i])))
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
    } else if (left instanceof Map) {
      return (right instanceof Map) && iteratorsEqual(left.entries(), right.entries())
    } else if (left instanceof Set) {
      return (right instanceof Set) && iteratorsEqual(left.values(), right.values())
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
    } else if (obj instanceof Map) {
      // oops at the intermediate conversion to Array (TODO?)
      return new Map(Array.from(
        obj.entries(),
        ([key, value]) => [objectClone(key), objectClone(value)]
      ))
    } else if (obj instanceof Set) {
      // oops at the intermediate conversion to Array (TODO?)
      return new Set(Array.from(obj.values(), objectClone))
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
    } else if (obj instanceof Map) {
      obj.forEach((value, key) => {
        objectFreeze(value)
        objectFreeze(key)
      })
      // TODO: Maps themselves cannot be frozen. that's bad.
      return obj
    } else if (obj instanceof Set) {
      obj.forEach(objectFreeze)
      // TODO: Sets themselves cannot be frozen. that's bad.
      return obj
    } else {
      throw new Error(`tried to freeze unfreezeable object ${obj}`)
    }
  }
}
