- Do we want to rename objects to something else to avoid confusion with JS objects? "Entities"?
- Add typed arrays to the list of compatible types. Also Map, Set, ... ugh

- Web Workers
  - Communication only by message-passing, and messages must be serializable. Unless we require all data structures to be serializable, the only reasonable implementation seems to be storing the entire program in a Web Worker.

- UI
  - Rendering flow: React-like (diffing) or manual updates. Note that D3 is an important target, and D3 encourages manual DOM fiddling, which requires disabling diffing anyway. Might be possible to have the best of both worlds by only using DOM-less D3 plugins, but that doesn't sound very pleasant.

- Program editor
  - I kind of want to use D3 for this. Is D3 okay with me reaching inside individual nodes' DOM and changing it (to render individual objects without rerendering the whole thing)? Will it not overwrite that during the next update?
