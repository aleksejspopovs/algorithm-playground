# Overview

An APG **program** consists of **objects** connected by directed **wires**.

An object has an internal state and an interface and can perform computation (and send messages down outgoing wires) when messages arrive on incoming wires or when a user interacts with it.

# Objects

Objects are instantiations of subclasses of `APGObject`. An object has:

- a **constructor**, which takes no arguments, calls the parent's constructor, and then may
	- create input and output plugs by calling `this.addInputPlug(name)` or `this.addOutputPlug(name)`
	- configure its minimum displayed size TKTK
	- initialize its state object, `this.state`

- two **processing methods**, `processMessage(plugName, message)` and `processEvent(event)`, which are called when a message arrives on an input plug or the user interacts with the object's display. Processing methods may:
	- update object state, in which case they must call `this.stateUpdated()` before returning[^obj-state-updated]
	- send messages down output plugs by calling `this.outputMessage(plugName, message)`

- a **render method**, `render(node)`, which renders the current state of the object into the HTML element `node`. The render method may not modify state.

	Any HTML event listener that `render` creates may not modify state either. To modify state on user interaction, the event listeners should call `this.triggerEvent(event)` (where `event` might contain any auxiliary information that the event processing method will need), which will schedule a call to `processEvent`. The same applies to any timers created during rendering or processing.

	`node`, as well as any HTML elements created by `render`, may not be accessed or modified outside of a call to `render`. Long-term state should not be stored in HTML elements: while they will generally be persisted (so it is fine, for example, to create a text input element and expect that it will be around long enough for the user to be able to type something in it), the `render` method should not assume this, nor should it assume that the `node` element will be the same across all calls to `render`.

`APGObject` provides a dummy constructor, processing methods and a render method that do not do anything, and an implementor may rely on their presence.

Additionally, a subclass of `APGObject` must have a static member `metadata`, containing metadata about the object type used in the UI.[^obj-metadata]

[^obj-state-updated]: This is inelegant, but we need to know when the state has changed and a render is necessary. (React does this by requiring you to use the `.setState()` method for all changes to the state, but that assumes you only have immutable objects in your state.)
[^obj-metadata]: TBD

# Wires and Messages

A wire connects an output plug of an object to an input plug of an object. The objects need not be distinct, and the connection graph may have cycles and multiple edges.

Wires transmit messages from the output plug to the input plug. A message consists of a single JavaScript object[^msg-typing]. The object does not have to be serializable.

The receiving object must not modify the contents of messages it receives[^msg-immutable], and also must not assume that the contents of the message will continue to exist or remain unchanged after the message has been processed. As an exception to this rule, an object received on an incoming wire can be included in a message sent down an outgoing wire while it is being processed.

The sending object may assume that the contents of messages it sends will not be modified.

[^msg-immutable]: How can this be enforced? It probably cannot. Does ECMAScript have any sort of a const modifier for function parameters yet?
[^msg-typing]: Do we want to let users enforce typing? If so, it would have to be a property of the plugs and the wires could check if the source type is compatible with the destination type. But I am not sure we want to build a real type system on top of JavaScript.

# Execution model

APG objects should not make assumptions about whether processing happens in parallel or sequentially.
