Every box has an associated queue of tasks. A task is created when processing is scheduled for the box (in response to new values on the input plugs or UI events). A box is active if its queue is nonempty and the task at the front of its queue is not in an `AWAITING` state (see below). That task is called the box's active task.

At any time, only active tasks can be executing. Tasks use cooperative multitasking, so a long-running task can choose to yield in order to allow other boxes' tasks to do work or the UI to update. A task can also yield-await, that is, notify the scheduler that it has no work to do until a given promise resolves.

Therefore, a box's active task can be in any of the following states:

- `NOT_STARTED`: the task is not running, and never has been
- `EXECUTING`: it is the task that is currently running
- `PAUSED`: the task was running before, but was paused. it can be resumed now.
- `AWAITING`: the task was running before, but was paused. it cannot be resumed yet.

When a task is executed, it is provided with a promise generator `yieldControl` as its first parameter. To yield, call `yieldControl`, which will return a promise. This promise will resolve when it is time for you to keep computing, so you should probably `await` on it, and it will return a JavaScript object. If you pass another promise `p` as an argument to `yieldControl`, the promise will not resolve until `p` has resolved (or errored), and the return object will contain `p`'s return value in the `data` attribute. (TODO: timeout?)

TODO: Signals? Forcefully terminating tasks?

When the scheduler is asked to do work, it first checks how much time has passed since the last UI update. If it has been more than 100ms, the scheduler allows the UI to update by awaiting on a zero-duration timeout. Otherwise, the scheduler picks a `PAUSED` task to run in a round-robin fashion.

