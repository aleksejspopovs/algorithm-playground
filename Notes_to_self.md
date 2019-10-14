- Do we want to rename objects to something else to avoid confusion with JS objects? "Entities"?

- Some objects might want to do processing in their constructor (e.g. `STInitializer` could write to its output plug immediately?) but currently cannot (since at construction time they are not attached yet), should we give them a mechanism to return something to be called after they're attached?

- An object that will be useful for interactive programs that repeatedly apply the same/similar operation to the same objects would be a kind of a "hold register": an object with one input plug, one output plug, and a button that writes the input value to the output register.
