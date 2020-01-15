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
  }

  addTask (boxId, task) {
    let box = this.program._boxes.get(boxId)
    if (!box.active()) {
      // adding this task will make the box active
      if (this.currentActiveBox === null) {
        this.currentActiveBox = boxId
        box.nextActive = box.prevActive = boxId
      } else {
        box.prevActive = this.currentActiveBox
        box.nextActive = this.program._boxes.get(this.currentActiveBox).nextActive
        this.program._boxes.get(box.prevActive).nextActive = boxId
        this.program._boxes.get(box.nextActive).prevActive = boxId
      }
      this.program._apg && this.program._apg.startBoxProcessing(boxId)
    }
    box.tasks.push(task)
  }

  popActiveTask (boxId, error) {
    let box = this.program._boxes.get(boxId)
    let task = box.tasks.pop()

    box.activeTaskState = TaskState.NotStarted
    box.activeTaskResume = null
    box.activeTaskDone = null
    box.activeTaskPaused = null
    box.activeTaskNotifyPause = null

    if (!box.active()) {
      // this was the last task, so the box is no longer active
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
      this.program._apg && this.program._apg.finishBoxProcessing(boxId, error)
    }
    return task
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
        let delay = new Promise(resolve => setTimeout(resolve, 0))
        await delay
        this.lastUiUpdate = (new Date()).getTime()
      }

      let boxId = this.currentActiveBox
      let box = this.program._boxes.get(boxId)
      this.currentActiveBox = box.nextActive

      let yieldControl = waitOn => {
        assert(waitOn === undefined, 'waiting not implemented yet')

        if (box.activeTaskNotifyPause !== null) {
          box.activeTaskNotifyPause()
        }

        box.activeTaskState = TaskState.Paused
        assert(box.object._isProcessing)
        box.object._isProcessing = false
        let promise = new Promise(resolve => {
          box.activeTaskResume = resolve
        })
        box.activeTaskPaused = new Promise(resolve => {
          box.activeTaskNotifyPause = resolve
        })
        return promise
      }

      let taskFinished = error => {
        assert(box.object._isProcessing)
        box.object._isProcessing = false
        this.program.refreshBox(boxId)
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
          // if the task if a regular function, this will transform
          // it into an async one (so we can treat it as a promise, and
          // exceptions will be turned into that promise being rejected).
          let taskAsync = async (yieldControl) => await task(yieldControl)
          let result = taskAsync(yieldControl)

          if (result instanceof Promise) {
            // the task returned a promise. yieldControl should've taken
            // care of updating the status to Paused.

            if (box.activeTaskState === TaskState.Paused) {
              // the task awaited on yieldControl, so we'll let it
              // finish up asynchronously whenever it's ready.
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
          }
        break;
        case TaskState.Paused:
          box.activeTaskState = TaskState.Executing
          assert(!box.object._isProcessing)
          box.object._isProcessing = true

          box.activeTaskResume({})

          // we want to wait until this task either completes or pauses again.
          await Promise.race([box.activeTaskDone, box.activeTaskPaused])
        break;
        default:
          assert(false, `unexpected task state ${box.activeTaskState}`)
        break;
      }
    }

    this.running = false
  }
}
