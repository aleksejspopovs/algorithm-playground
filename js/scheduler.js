import {assert} from './utils/assert.js'

const MaxUiDelayMs = 100
const ProcessingTooLongWarnMs = 100
const ProcessingTooLongErrorMs = 1000

export var TaskState = {
  NotStarted: 'not_started',
  Executing: 'executing',
  Paused: 'paused',
  Awaiting: 'awaiting',
}

export class TerminateTaskException {
  toString () {
    return this.constructor.name
  }
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

  makeBoxActive (boxId, runScheduler=true) {
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

    if (runScheduler) {
      this.run()
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
    let wasEmpty = box.tasks.empty()
    box.tasks.push(task)
    if (wasEmpty) {
      // adding this task will make the box active
      this.makeBoxActive(boxId)
      this.program._apg && this.program._apg.startBoxProcessing(boxId)
    }
  }

  popActiveTask (boxId, error) {
    let box = this.program._boxes.get(boxId)
    let task = box.tasks.pop()

    box.resetActiveTaskState()

    // TODO: throw away all other tasks if error exists?

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

  async terminateAll () {
    // we go through all the boxes, not just the active ones, because we
    // want to take care of boxes that are inactive because they are awaiting.
    for (let [boxId, box] of this.program._boxes.entries()) {
      while (!box.tasks.empty()) {
        switch (box.activeTask.state) {
          case TaskState.NotStarted:
            this.popActiveTask(boxId, null)
          break;
          case TaskState.Awaiting:
            // just switch the task to Paused and let it be terminated
            // like any other Paused task. note that activeTask.terminate()
            // will prevent the original promise from doing anything to this
            // task after it has terminated.
            box.activeTask.state = TaskState.Paused
            this.makeBoxActive(boxId, false)
            // intentional fall-through: the code for Paused will now also
            // execute!
          case TaskState.Paused:
            box.activeTask.state = TaskState.Executing
            assert(!box.object._isProcessing)
            box.object._isProcessing = true

            box.activeTask.terminate(new TerminateTaskException())
            // wait until the task actually finishes.
            // TODO: it might instead catch the exception, in which case we
            // can at least mark it somehow and never schedule it again?
            // TODO: a timeout
            await box.activeTask.done
          break;
          default:
            // we do not expect to see a task that is Executing here,
            // although it is actually possible in the case where a task
            // misbehaves and awaits on a promise without wrapping it in
            // yieldControl.
            // we do not expect Awaiting tasks either, because their boxes
            // are not active.
            assert(false, `unexpected task state ${box.activeTask.state} in Scheduler.terminateAll`)
          break;
        }
      }
    }
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

        if (this.currentActiveBox === null) {
          // someone must have terminated the scheduler during the delay
          break
        }
      }

      let boxId = this.currentActiveBox
      let box = this.program._boxes.get(boxId)
      this.currentActiveBox = box.nextActive

      let yieldControl = waitOn => {
        if (box.activeTask.notifyPause !== null) {
          box.activeTask.notifyPause()
        }
        assert(box.object._isProcessing)
        box.object._isProcessing = false

        // we use this flag to detect if the task has been terminated
        // while awaiting on this promise, to know when the resolution
        // of the promise should just be ignored.
        let terminated = false

        if (waitOn) {
          // the task wants to wait on a promise.
          // prevent the task from being scheduled again for now
          box.activeTask.state = TaskState.Awaiting
          this.makeBoxInactive(boxId)
          waitOn.then(
            value => {
              !terminated && (box.activeTask.promiseReturnValue = [true, value])
            },
            error => {
              !terminated && (box.activeTask.promiseReturnValue = [false, error])
            }
          ).finally(() => {
            if (terminated) {
              return
            }

            // when the waitOn promise resolves, keep the return value/error
            // and make it look like the box was just paused so that the
            // scheduler can schedule it again
            box.activeTask.state = TaskState.Paused
            this.makeBoxActive(boxId)
          })
        } else {
          // the task wants to simply yield execution for a little bit
          box.activeTask.state = TaskState.Paused
          box.activeTask.promiseReturnValue = [true, null]
        }

        let promise = new Promise((resolve, reject) => {
          box.activeTask.resume = resolve
          box.activeTask.terminate = (error) => {
            terminated = true
            reject(error)
          }
        })
        box.activeTask.paused = new Promise(resolve => {
          box.activeTask.notifyPause = resolve
        })
        return promise
      }

      let taskFinished = error => {
        assert(box.object._isProcessing)
        box.object._isProcessing = false
        this.boxesToRefresh.add(boxId)
        this.popActiveTask(boxId, error)
      }

      let timeStart = (new Date).getTime()

      switch (box.activeTask.state) {
        case TaskState.NotStarted:
          let task = box.tasks.peek()
          box.activeTask.state = TaskState.Executing
          assert(!box.object._isProcessing)
          box.object._isProcessing = true

          // we wrap the task in an async call.
          // if the task is an async function, this does nothing.
          // if the task is a regular function, this will transform
          // it into an async one (so we can treat it as a promise, and
          // exceptions will be turned into that promise being rejected).
          let taskAsync = async (yieldControl) => await task(yieldControl)
          let result = taskAsync(yieldControl)

          box.activeTask.done = result.then(
            (value) => taskFinished(null),
            (error) => taskFinished(error),
          )

          if (box.activeTask.state === TaskState.Executing) {
            // the task didn't await on yieldControl, so (assuming it
            // didn't await on anything else, which it isn't supposed to
            // do) it must be finished (possibly with an error).
            // we await on it so that we can throw it out of the queue
            // immediately and carry on.
            await box.activeTask.done
          }
        break;
        case TaskState.Paused:
          box.activeTask.state = TaskState.Executing
          assert(!box.object._isProcessing)
          box.object._isProcessing = true

          let [promiseStatus, promiseValue] = box.activeTask.promiseReturnValue
          if (promiseStatus) {
            // either the task didn't await on any promise, or the promise
            // resolved successfuly
            box.activeTask.resume({data: promiseValue})
          } else {
            // the task awaited on a promise that rejected
            box.activeTask.terminate(promiseValue)
          }

          // we want to wait until this task either completes or pauses again.
          await Promise.race([box.activeTask.done, box.activeTask.paused])
        break;
        // we do *not* expect to find Awaiting or Executing tasks here
        default:
          assert(false, `unexpected task state ${box.activeTask.state} in Scheduler.run`)
        break;
      }

      let timePassed = (new Date()).getTime() - timeStart
      if (timePassed > ProcessingTooLongErrorMs) {
        console.error(
          `box ${boxId} ran for ${timePassed} ms. `
          + `use yieldControl to pause execution to make sure the UI stays responsive, `
          + `aiming for at most ${ProcessingTooLongWarnMs} ms between pauses.`
        )
      } else if (timePassed > ProcessingTooLongWarnMs) {
        console.warn(
          `box ${boxId} ran for ${timePassed} ms. `
          + `use yieldControl to pause execution to make sure the UI stays responsive, `
          + `aiming for at most ${ProcessingTooLongWarnMs} ms between pauses.`
        )
      }
    }


    this.performDeferredUiUpdates()
    this.running = false
  }
}
