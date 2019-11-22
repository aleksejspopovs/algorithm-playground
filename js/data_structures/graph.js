import {generateUnusedKey, objectsEqual, objectClone, objectFreeze} from '../utils/objects.js'
import {APGData} from '../data.js'

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
}

export class Graph extends APGData {
  constructor (directed = false) {
    super()
    this.directed = directed
    this._nodeJustAdded = null
    this._nodes = new Map()
    this._edges = new Map()
    this._edgesFrom = new Map()
  }

  equals (other) {
    return (
      (this.directed === other.directed)
      && (this._nodeJustAdded === other._nodeJustAdded)
      && objectsEqual(this._nodes, other._nodes)
      && objectsEqual(this._edges, other._edges)
      && objectsEqual(this._edgesFrom, other._edges)
    )
  }

  clone () {
    let result = new Graph(this.directed)
    result._nodeJustAdded = this._nodeJustAdded
    result._nodes = objectClone(this._nodes)
    result._edges = objectClone(this._edges)
    result._edgesFrom = objectClone(this._edgesFrom)
    return result
  }

  freeze () {
    objectFreeze(this._nodes)
    objectFreeze(this._edges)
    objectFreeze(this._edgesFrom)
    Object.freeze(this)
  }

  addNode (name, x, y) {
    name = name || generateUnusedKey(this._nodes, 'node')

    if (this._nodes.has(name)) {
      throw new Error(`node named ${name} already exists`)
    }

    let node = new Node(name, x, y)
    this._nodes.set(name, node)
    this._edgesFrom.set(name, [])
    this._nodeJustAdded = name

    return this
  }

  nodeJustAdded () {
    return this._nodeJustAdded
  }

  nodes () {
    return this._nodes.keys()
  }

  moveNode (name, newX, newY) {
    this._nodes.get(name).x = newX
    this._nodes.get(name).y = newY
  }

  addEdge (name, from, to) {
    name = name || generateUnusedKey(this._edges, 'edge')

    if (!(this._nodes.has(from) && this._nodes.has(to))) {
      throw new Error(`one of nodes ${from} and ${to} does not exist`)
    }
    if (this._edges.has(name)) {
      throw new Error(`edge named ${name} already exists`)
    }

    let edge = new Edge(name, from, to)
    this._edges.set(name, edge)
    this._edgesFrom.get(from).push(name)
    if (!this.directed) {
      this._edgesFrom.get(to).push(name)
    }

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
    return this._edges.get(name)
  }

  offset (dx, dy, scale=1.0, nodePrefix='', rot=0.0) {
    return new GraphProxy(this, dx, dy, scale, rot, nodePrefix)
  }

  flattenEdge (name) {
    return {
      from: this._nodes.get(this._edges.get(name).from),
      to: this._nodes.get(this._edges.get(name).to)
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
