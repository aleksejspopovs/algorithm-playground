# Overview

An APG **program** consists of **objects** connected by directed **wires**.

An object has an internal state, a collection of input and output plugs (which act as registers, always holding a specific value), and an interface. It can perform computation (potentially changing its state and the values on its output plugs) when the values on input plugs change or when a user interacts with its interface.

# Objects

Objects are instantiations of subclasses of `APGObject`.

## Members

An object has:

- a **constructor**, which takes no arguments, calls the parent's constructor, and then may
	- create input and output plugs by calling `this.newInputPlug(name, updateHandler)` or `this.newOutputPlug(name)`
	- configure its minimum displayed size TKTK
	- initialize its state object, `this.state`

- a **render method**, `render(node)`, which renders the current state of the object into the HTML element `node`. The render method, as well as any DOM event listeners created in it, may not modify object state (see "Processing mode" below for more details).

	`node`, as well as any HTML elements created by `render`, may not be accessed or modified outside of a call to `render`. Long-term state should not be stored in HTML elements: while they will generally be persisted (so it is fine, for example, to create a text input element and expect that it will be around long enough for the user to be able to type something in it), the `render` method should not assume this, nor should it assume that the `node` element will be the same across all calls to `render`.

`APGObject` provides a dummy constructor and a render method that do not do anything, and an implementor may rely on their presence.

Additionally, a subclass of `APGObject` must have a static member `metadata`, containing metadata about the object type to be used in the UI.[^obj-metadata]

## Processing mode

At any given moment in time, an object is either in **processing mode** or not. Changing the object's state or the values on its output plugs, as well as performing any intensive computation is allowed **only** in processing mode. The object is guaranteed to be in processing mode during:

- calls to an input plug's update handler,
- calls to a callback scheduled with `this.scheduleProcessing`.

The object will not in processing mode during rendering, or when DOM events or timers fire (so if any processing needs to be performed in response to those, the object must use `this.scheduleProcessing`).

[^obj-metadata]: TBD

# Plugs and Wires

Objects have input and output plugs. Every plug is essentially a register, that is, it holds a single value at a time. An object may read the values on its input plugs and write to the values on its output plugs.

A wire connects an output plug of an object to an input plug of an object. The objects need not be distinct, and the connection graph may have cycles and multiple edges. When an output plug A is connected to input plug B, every write to plug A will also overwrite the value on plug B. Removing a wire has no effect on the values of either of its endpoints. Creating a new wire will overwrite the value of the destination plug with the value of the source plug, unless the value of the source plug is `null`.

The value of a plug is a JavaScript object[^msg-typing]. The object does not have to be serializable, but it does have to be acyclic and copyable[^msg-acyclic-copyable].

To write a value to an output plug, use `plug.write(obj)`. You may assume that `obj` will not be modified by the plug or anything else (during or after the call to `write`), and any changes you make to it after the call to `write` will not be propagated.

To read a value from an input plug, use `plug.read()`. The result object will be [deep-frozen](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze), i.e., you will not be able to modify it. If you would like to obtain a non-frozen copy of the object, use `plug.copy()`.

[^msg-typing]: Do we want to let users enforce typing? If so, it would have to be a property of the plugs and the wires could check if the source type is compatible with the destination type. But I am not sure we want to build a real type system on top of JavaScript.

[^msg-acyclic-copyable]: TKTK

# Execution model

APG objects should not make assumptions about whether processing happens in parallel or sequentially.
