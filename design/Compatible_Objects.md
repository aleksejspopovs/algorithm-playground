# APG-compatible JavaScript objects

Only APG-compatible JavaScript objects can be written to plugs.

The following objects are APG-compatible:

- null
- booleans, numbers, and strings
- arrays containing only APG-compatible objects as elements
- plain objects (ones that are not instantiations of classes, like `{hello: 'world'}`) containing only APG-compatible objects as values
- `Map` and `Set` objects containing only APG-compatible objects as keys and values
- instantiations of classes that subclass `APGData`, which requires them to implement the following member methods:
	- `equals(other)` returns a boolean which is true if `other` is equal to `this`. `other` is guaranteed to be an instance of the same class (not of a subclass). What exactly equality means will depend on the particular data structure/object you are implementing, but generally objects should be equal if carrying out the same computation on them always produces equal outputs.
	- `clone()` returns another object which is equal (in the above sense) to `this`, but such that no modifications to `this` would affect it, and vice-versa.
	- `freeze()` irreversibly prevents modifications to `this` and all of its members.
	- (It is expected that, for most classes, these three methods can be implemented by recursively calling these same methods on the members of an object. Helper functions are provided in `util.js` for comparing, cloning, and freezing arbitrary APG-compatible objects.)
