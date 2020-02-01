import {generateUnusedKey, objectsEqual, objectClone, objectFreeze} from '../utils/objects.js'
import {APGData} from '../data.js'

// makes a string with the property that
// nodePair(a, b) == nodePair(x, y) iff a == x and b == y.
// if ordered is false, they will also compare as true if
// a == y and b == x.
// (we use these as keys for a Set, where a two-element
// list wouldn't do since they don't compare equal even if
// they have the same elements.)
function nodePair(a, b, ordered) {
  if (!ordered && (b < a)) {
    let tmp = a
    a = b
    b = tmp
  }
  return `${a.length}|${a}|${b.length}|${b}`
}

export class Node extends APGData {
  constructor (name, x, y) {
    super()
    this.name = name
    this.x = x
    this.y = y
  }

  equals (other) {
    return (
      (this.name === other.name)
      && (this.x === other.x)
      && (this.y === other.y)
    )
  }

  clone (other) {
    return new Node(this.name, this.x, this.y)
  }

  freeze (other) {
    Object.freeze(this)
  }
}

export class Edge extends APGData {
  constructor (name, from, to) {
    super()
    this.name = name
    this.from = from
    this.to = to
  }

  equals (other) {
    return (
      (this.name === other.name)
      && (this.from === other.from)
      && (this.to === other.to)
    )
  }

  clone (other) {
    return new Edge(this.name, this.from, this.to)
  }

  freeze (other) {
    Object.freeze(this)
  }

  other (node) {
    if (node === this.from) {
      return this.to
    } else if (node === this.to) {
      return this.from
    } else {
      throw new Error(`${node} is not either of the endpoints of this edge`)
    }
  }
}

// Graph is a graph with no parallel edges or self-loops.
// depending on how you call the constructor, it might or
// might not be directed.
export class Graph extends APGData {
  constructor (directed = false) {
    super()
    this.directed = directed
    this._nodeJustAdded = null
    this._nodes = new Map()
    this._edges = new Map()
    this._edgesFrom = new Map()
    this._edgeSet = new Set()
  }

  equals (other) {
    return (
      (this.directed === other.directed)
      && (this._nodeJustAdded === other._nodeJustAdded)
      && objectsEqual(this._nodes, other._nodes)
      && objectsEqual(this._edges, other._edges)
      && objectsEqual(this._edgesFrom, other._edgesFrom)
      && objectsEqual(this._edgeSet, other._edgeSet)
    )
  }

  clone () {
    let result = new Graph(this.directed)
    result._nodeJustAdded = this._nodeJustAdded
    result._nodes = objectClone(this._nodes)
    result._edges = objectClone(this._edges)
    result._edgesFrom = objectClone(this._edgesFrom)
    result._edgeSet = objectClone(this._edgeSet)
    return result
  }

  freeze () {
    objectFreeze(this._nodes)
    objectFreeze(this._edges)
    objectFreeze(this._edgesFrom)
    objectFreeze(this._edgeSet)
    Object.freeze(this)
  }

  addNode (name, x, y) {
    name = name || generateUnusedKey(this._nodes, 'node')

    if (this._nodes.has(name)) {
      throw new Error(`node named ${name} already exists`)
    }

    let node = new Node(name, x, y)
    this._nodes.set(name, node)
    this._edgesFrom.set(name, new Set())
    this._nodeJustAdded = name

    return this
  }

  deleteNode (name) {
    if (!this._nodes.has(name)) {
      throw new Error(`node ${name} does not exist`)
    }

    if (this._nodeJustAdded === name) {
      this._nodeJustAdded = null
    }

    this.edgesFrom(name).forEach((e) => this.deleteEdge(e))

    this._edgesFrom.delete(name)
    this._nodes.delete(name)

    return this
  }

  nodeJustAdded () {
    return this._nodeJustAdded
  }

  nodes () {
    return this._nodes.keys()
  }

  getNode (name) {
    if (!this._nodes.has(name)) {
      throw new Error(`node ${name} does not exist`)
    }
    return this._nodes.get(name)
  }

  nodeCount () {
    return this._nodes.size
  }

  moveNode (name, newX, newY) {
    this._nodes.get(name).x = newX
    this._nodes.get(name).y = newY

    return this
  }

  addEdge (name, from, to) {
    name = name || generateUnusedKey(this._edges, 'edge')

    if (!(this._nodes.has(from) && this._nodes.has(to))) {
      throw new Error(`one of nodes ${from} and ${to} does not exist`)
    }
    if (this._edges.has(name)) {
      throw new Error(`edge named ${name} already exists`)
    }
    if (this._edgeSet.has(nodePair(from, to, this.directed))) {
      throw new Error(`edge between ${from} and ${to} already exists`)
    }
    if (from === to) {
      throw new Error(`self-loops are not allowed`)
    }

    let edge = new Edge(name, from, to)
    this._edges.set(name, edge)
    this._edgesFrom.get(from).add(name)
    if (!this.directed) {
      this._edgesFrom.get(to).add(name)
    }
    this._edgeSet.add(nodePair(from, to, this.directed))

    return this
  }

  deleteEdge (name) {
    if (!this._edges.has(name)) {
      throw new Error(`edge ${name} does not exist`)
    }

    let edge = this._edges.get(name)
    this._edgesFrom.get(edge.from).delete(name)
    if (!this.directed) {
      this._edgesFrom.get(edge.to).delete(name)
    }
    this._edgeSet.delete(nodePair(edge.from, edge.to, this.directed))

    this._edges.delete(name)

    return this
  }

  edges () {
    return this._edges.keys()
  }

  edgesFrom (name) {
    /* NB: in an undirected graph, not all returned edges will have the
       given one in the *from* position */
    return this._edgesFrom.get(name)
  }

  getEdge (name) {
    if (!this._edges.has(name)) {
      throw new Error(`edge ${name} does not exist`)
    }
    return this._edges.get(name)
  }

  hasEdgeBetween (from, to) {
    return this._edgeSet.has(nodePair(from, to, this.directed))
  }

  offset (dx, dy, scale=1.0, nodePrefix='', rot=0.0) {
    return new GraphProxy(this, dx, dy, scale, rot, nodePrefix)
  }

  flattenEdge (name) {
    let edge = this._edges.get(name)
    return {
      name: name,
      from: this._nodes.get(edge.from),
      to: this._nodes.get(edge.to)
    }
  }

  flatten () {
    let nodeNames = Object.keys(this._nodes)
    let edgeNames = Object.keys(this._edges)

    return [
      Array.from(this._nodes.keys(), v => this._nodes.get(v)),
      Array.from(this._edges.keys(), e => this.flattenEdge(e))
    ]
  }

  complemented () {
    let result = new Graph(this.directed)

    for (let node of this._nodes.values()) {
      result.addNode(node.name, node.x, node.y)
    }

    for (let nodeA of this._nodes.keys()) {
      for (let nodeB of this._nodes.keys()) {
        if (
          (nodeA !== nodeB)
          && !this.hasEdgeBetween(nodeA, nodeB)
          && !result.hasEdgeBetween(nodeA, nodeB)
        ) {
          result.addEdge(null, nodeA, nodeB)
        }
      }
    }

    return result
  }

  boundingBox () {
    if (this._nodes.size === 0) {
      return {x1: 0, y1: 0, x2: 0, y2: 0}
    }

    let nodes = this._nodes.values()
    let firstNode = nodes.next().value
    let x1 = firstNode.x
    let x2 = firstNode.x
    let y1 = firstNode.y
    let y2 = firstNode.y

    for (let node of nodes) {
      x1 = Math.min(x1, node.x)
      y1 = Math.min(y1, node.y)
      x2 = Math.max(x2, node.x)
      y2 = Math.max(y2, node.y)
    }

    return {x1, y1, x2, y2}
  }
}

// NB: GraphProxy does not inherit from APGData, so it cannot be written to
// plugs. it is only meant to be used as a convenience object to be used in
// processing code.
class GraphProxy {
  constructor (graph, cx, cy, scale, rot, nodePrefix) {
    this._graph = graph
    this._cx = cx
    this._cy = cy
    this._scale = scale
    this._rot = rot
    this._nodePrefix = nodePrefix

    this._nodeJustAdded = null
  }

  _coordsToGraph (x, y) {
    let rotatedX = x * Math.cos(this._rot) - y * Math.sin(this._rot)
    let rotatedY = x * Math.sin(this._rot) + y * Math.cos(this._rot)
    let graphX = this._cx + this._scale * rotatedX
    let graphY = this._cy + this._scale * rotatedY
    return [graphX, graphY]
  }

  addNode (name, x, y) {
    let [graphX, graphY] = this._coordsToGraph(x, y)
    let fullName = (name === null)
      ? this._graph.generateNodeName(nodePrefix)
      : (this._nodePrefix + name)
    this._graph.addNode(fullName, graphX, graphY)
    this._nodeJustAdded = fullName
    return this
  }

  addEdge (name, from, to) {
    let fromName = from.startsWith('$') ? from.slice(1) : this._nodePrefix + from
    let toName = to.startsWith('$') ? to.slice(1) : this._nodePrefix + to
    this._graph.addEdge(name, fromName, toName)
    return this
  }

  moveNode (name, newX, newY) {
    let fullName = this._nodePrefix + name
    let [transformedX, transformedY] = this._coordsToGraph(newX, newY)
    this._graph.moveNode(fullName, transformedX, transformedY)
  }

  nodeJustAdded () {
    return this._nodeJustAdded
  }

  offset (dx, dy, scale=1.0, nodePrefix='', rot=0.0) {
    return new GraphProxy(this, dx, dy, scale, rot, nodePrefix)
  }
}
