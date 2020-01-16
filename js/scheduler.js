import {assert} from './utils/assert.js'

const MaxUiDelayMs = 100

export var TaskState = {
  NotStarted: 'not_started',
  Executing: 'executing',
  Paused: 'paused',
  Awaiting: 'awaiting',
}

export class Scheduler {
  constructor (program) {
    this.program = program
    this.currentActiveBox = null
    this.lastUiUpdate = 0
    this.running = false

    this.boxesToRefresh = new Set()
    this.wiresToAnimate = new Set()
  }

  makeBoxActive (boxId) {
    let box = this.program._boxes.get(boxId)
    assert(box.prevActive === null)
    assert(box.nextActive === null)

    if (this.currentActiveBox === null) {
      this.currentActiveBox = boxId
      box.nextActive = box.prevActive = boxId
    } else {
      box.prevActive = this.currentActiveBox
      box.nextActive = this.program._boxes.get(this.currentActiveBox).nextActive
      this.program._boxes.get(box.prevActive).nextActive = boxId
      this.program._boxes.get(box.nextActive).prevActive = boxId
    }
  }

  makeBoxInactive (boxId) {
    let box = this.program._boxes.get(boxId)
    assert(box.prevActive !== null)
    assert(box.nextActive !== null)

    if (box.nextActive === boxId) {
      this.currentActiveBox = null
    } else {
      if (this.currentActiveBox === boxId) {
        this.currentActiveBox = box.nextActive
      }
      this.program._boxes.get(box.nextActive).prevActive = box.prevActive
      this.program._boxes.get(box.prevActive).nextActive = box.nextActive
    }
    box.nextActive = box.prevActive = null
  }

  addTask (boxId, task) {
    let box = this.program._boxes.get(boxId)
    if (box.tasks.empty()) {
      // adding this task will make the box active
      this.makeBoxActive(boxId)
      this.program._apg && this.program._apg.startBoxProcessing(boxId)
    }
    box.tasks.push(task)
  }

  popActiveTask (boxId, error) {
    let box = this.program._boxes.get(boxId)
    let task = box.tasks.pop()

    // TODO: move this out to BoxWithMetadata?
    box.activeTaskState = TaskState.NotStarted
    box.activeTaskResume = null
    box.activeTaskTerminate = null
    box.activeTaskPromiseReturnValue = null
    box.activeTaskDone = null
    box.activeTaskPaused = null
    box.activeTaskNotifyPause = null

    if (box.tasks.empty()) {
      // this was the last task, so the box is no longer active
      this.makeBoxInactive(boxId)
      this.program._apg && this.program._apg.finishBoxProcessing(boxId, error)
    }
    return task
  }

  performDeferredUiUpdates () {
    for (let boxId of this.boxesToRefresh) {
      // need to check if the box still exists, since it might have been
      // deleted in between the time when we marked it as needing an update
      // and now.
      if (this.program._boxes.has(boxId)) {
        this.program.refreshBox(boxId)
      }
    }
    this.boxesToRefresh.clear()

    for (let wire of this.wiresToAnimate) {
      // check if the wire still exists (as above).
      if (this.program._wires.has(wire)) {
        this.program.flashWireActivity(wire)
      }
    }
    this.wiresToAnimate.clear()
  }

  deferWireFlash (wire) {
    this.wiresToAnimate.add(wire)
  }

  async run () {
    if (this.running) {
      return
    }

    this.running = true

    while (this.currentActiveBox !== null) {
      if ((new Date()).getTime() - this.lastUiUpdate > MaxUiDelayMs) {
        // it's been too long since we last let the browser update
        // the UI
        this.performDeferredUiUpdates()
        let delay = new Promise(resolve => setTimeout(resolve, 0))
        await delay
        this.lastUiUpdate = (new Date()).getTime()
      }

      let boxId = this.currentActiveBox
      let box = this.program._boxes.get(boxId)
      this.currentActiveBox = box.nextActive

      let yieldControl = waitOn => {
        if (box.activeTaskNotifyPause !== null) {
          box.activeTaskNotifyPause()
        }
        assert(box.object._isProcessing)
        box.object._isProcessing = false

        if (waitOn) {
          // the task wants to wait on a promise.
          // prevent the task from being scheduled again for now
          box.activeTaskState = TaskState.Awaiting
          this.makeBoxInactive(boxId)
          waitOn.then(
            value => {
              box.activeTaskPromiseReturnValue = [true, value]
            },
            error => {
              box.activeTaskPromiseReturnValue = [false, error]
            }
          ).finally(() => {
            // when the waitOn promise resolves, keep the return value/error
            // and make it look like the box was just paused so that the
            // scheduler can schedule it again
            box.activeTaskState = TaskState.Paused
            this.makeBoxActive(boxId)
            // it's possible that the scheduler ran out of tasks and
            // terminated while we were waiting for the promise to resolve,
            // so we need to try running it
            this.run()
          })
        } else {
          // the task wants to simply yield execution for a little bit
          box.activeTaskState = TaskState.Paused
          box.activeTaskPromiseReturnValue = [true, null]
        }

        let promise = new Promise((resolve, reject) => {
          box.activeTaskResume = resolve
          box.activeTaskTerminate = reject
        })
        box.activeTaskPaused = new Promise(resolve => {
          box.activeTaskNotifyPause = resolve
        })
        return promise
      }

      let taskFinished = error => {
        assert(box.object._isProcessing)
        box.object._isProcessing = false
        this.boxesToRefresh.add(boxId)
        this.popActiveTask(boxId, error)
      }

      switch (box.activeTaskState) {
        case TaskState.NotStarted:
          let task = box.tasks.peek()
          box.activeTaskState = TaskState.Executing
          assert(!box.object._isProcessing)
          box.object._isProcessing = true

          // we wrap the task in an async call.
          // if the task is an async function, this does nothing.
          // if the task is a regular function, this will transform
          // it into an async one (so we can treat it as a promise, and
          // exceptions will be turned into that promise being rejected).
          let taskAsync = async (yieldControl) => await task(yieldControl)
          let result = taskAsync(yieldControl)

          if (
            (box.activeTaskState === TaskState.Paused)
            || (box.activeTaskState === TaskState.Awaiting)
          ) {
            // the task awaited on yieldControl. we'll resume it at
            // some future point, but now we just set up some handlers
            // for when it's finished.
            box.activeTaskDone = result.then(
              (value) => taskFinished(null),
              (error) => taskFinished(error),
            )
          } else {
            // the task didn't await on yieldControl, so (assuming it
            // didn't await on anything else, which it isn't supposed to
            // do) it must be finished (possibly with an error).
            // we await on it so that we can throw it out of the queue
            // immediately and carry on.
            let error = null
            try {
              await result
            } catch (e) {
              error = e
            } finally {
              taskFinished(error)
            }
          }
        break;
        case TaskState.Paused:
          box.activeTaskState = TaskState.Executing
          assert(!box.object._isProcessing)
          box.object._isProcessing = true

          let [promiseStatus, promiseValue] = box.activeTaskPromiseReturnValue
          if (promiseStatus) {
            // either the task didn't await on any promise, or the promise
            // resolved successfuly
            box.activeTaskResume({data: promiseValue})
          } else {
            // the task awaited on a promise that rejected
            box.activeTaskTerminate(promiseValue)
          }

          // we want to wait until this task either completes or pauses again.
          await Promise.race([box.activeTaskDone, box.activeTaskPaused])
        break;
        // we do *not* expect to find Awaiting or Executing tasks here
        default:
          assert(false, `unexpected task state ${box.activeTaskState}`)
        break;
      }
    }

    this.performDeferredUiUpdates()
    this.running = false
  }
}
