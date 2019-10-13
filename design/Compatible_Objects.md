# APG-compatible JavaScript objects

Only APG-compatible JavaScript objects can be written to plugs.

The following objects are APG-compatible:

- booleans, numbers, and strings
- arrays containing only APG-compatible objects as elements
- "simple" objects (ones that are not instantiations of classes) containing only APG-compatible objects as values
- instantiations of classes that implement the following member methods:
	- `eq(other)` returns a boolean which is true if `other` is equal to `this`. What exactly this means will depend on a particular data structure/object you are implementing, but generally objects should be equal iff carrying out the same computation on them always produces equal outputs.
	- `clone()` returns another object which is equal (in the above sense) to `this`, but such that no modifications to `this` would affect it, and vice-versa.
	- `freeze()` irreversibly prevents modifications to `this` and all of its members.
	- (It is expected that, for most classes, these three methods can be implemented by recursively calling these same methods on the members of an object. Helper functions are provided un `util.js` for comparing, cloning, and freezing arbitrary APG-compatible objects.)
