# @janiscommerce/app-tracking-time
![janis-logo](brand-logo.png)

This package manages events in your application by interacting with a database. It provides functionalities to add, retrieve, and validate events. Also handles application state changes to pause ongoing events when the app goes into the background.

## Dependencies

To ensure the proper functioning of this library, make sure that the following dependencies are installed in your project:

### Required Peer Dependencies

- **`date-fns`**: `>=2.0.0 <5.0.0`
- **`react`**: `>=18.2.0 <20.0.0`
- **`react-native`**: `>=0.71.5 <0.82.0`
- **`react-native-fs`**: `^2.20.0`
- **`realm`**: `^12.0.0 || ^20.0.0`

These dependencies are required for the library to work correctly. Ensure that your project has these versions installed to avoid compatibility issues.

> **Upgrading from 2.x**: `date-fns` and `realm` used to be regular dependencies of this package, so they arrived transitively, and `react-native-fs` was not declared at all even though the package imports it. From 3.0.0 the three are peer dependencies — if your app does not already depend on them, declare them explicitly — and `realm` 11 is no longer supported (use 12 or 20). With `--legacy-peer-deps` npm ignores peers and reports nothing (yarn 1 only warns). The package imports them at the top of its modules, so a missing peer breaks the bundle rather than a later call: Metro fails with `Unable to resolve module date-fns` (or `react-native-fs`, `realm`).

## Installation

```bash
npm i @janiscommerce/app-tracking-time
```


## How to use?

First, creates a new instance of the EventTracker class and declare the name for the database:

```js
import EventTrackerClass from '@janiscommerce/app-tracking-time';

const EventTracker = new EventTrackerClass('events_database')

export default EventTracker;

```

### Save your first record:

To save an event you must call the addEvent method of the EventTracker class and pass it an object with the following parameters:

```js
import {EVENT_TYPES} from '@janiscommerce/app-tracking-time';

const saveInitEvent = async (id) => {
    try {
        await EventTracker.addEvent({id,type:EVENT_TYPES.START})
    } catch(error) {
        console.warn(error);
    }
}


<Button title='save new event' onPress={() => saveInitEvent('66e99577e128deb19d57cd74')}/>
```

This action will save a start type event associated with the id 66e99577e128deb19d57cd74

`EVENT_TYPES` is the exported vocabulary of the package (`START`, `PAUSE`, `RESUME`, `FINISH`); use it instead of writing the literals on your side. The type is normalized before being validated and stored, so `'START'` and `'start'` end up as the same record.

`time` is optional and defaults to the current time. If it is earlier than the record's last event (for example, the device clock went back), the event is stored 1 ms after that event: the sequence keeps validating, and the time worked while the clock is behind is left out of the net time instead of inflating it.

The event is validated and saved in the same write, so two calls that arrive at the same time on a record cannot both pass the validation: the second one is rejected.


### Save the whole history of a record:

To restore the history of a record (for example, the events your backend keeps for it), call `addEvents` with the id and the events, in any order. The history is saved in a single write: all of it, or nothing.

```js
const restoreHistory = async (id, events) => {
    try {
        const savedEvents = await EventTracker.addEvents(id, events)

        console.log(savedEvents);
    } catch(error) {
        console.warn(error);
    }
}
```

The history is normalized with the same rule as `getEventsById` (see [Sequence of recorded events](#sequence-of-recorded-events)). It is the whole history of the record, so the record must not have events yet: if it has any, nothing is saved and the promise is rejected. That check runs in the same write as the save, so of two simultaneous restores of a record only one is saved. It resolves with the events saved, in chronological order.


### Search all events associated with your id:

To get all the records you saved related to an id, you can call the getEventsById function:

```js
const fetchEventsById = async (id) => {
    try {
        const [events, fetchError] = await promiseWrapper(EventTracker.getEventsById(id))

        console.log(events);
    } catch(error) {
        console.warn(error);
    }
}


<Button title='fetch events' onPress={() => fetchEventsById('66e99577e128deb19d57cd74')}/>
```

### Delete all events of an id:

You can delete all records of an id using the deleteEventsById.

This method will be responsible for eliminating all the events that have been registered that have the id that you pass as an argument

```js
const deleteEvents = async (id) => {
    try {
        await EventTracker.deleteEventsById(id)
    } catch(error) {
        console.warn(error);
    }
}


<Button title='remove events' onPress={() => deleteEvents('66e99577e128deb19d57cd74')}/>
```

The cleanup method will be called once the component is unmounted and will unlisten for state changes from the app.
If any of the events you want to pause is already paused, what will happen is that the console will throw a warning with the error reported by the package.

### Sequence of recorded events

The package has internal validations that prevent events from being saved consecutively or that do not have coherence depending on the event that has been saved prior to this one.
For example, you will not be able to store 2 pause type events consecutively.

A record supports **multiple `start → finish` cycles**: a `finish` event closes the current cycle, and a new `start` right after it opens a new cycle without deleting the previous ones. A `finish` over an already finished record, or a `start` while a cycle is still in progress (`start`, `pause` or `resume` as the last event), is rejected. `getNetTrackingTime` returns the sum of every active span (`start|resume → pause|finish`) across all cycles; a trailing open span (record in progress) is not counted — compute live time on the caller side.

If you want to know what was the last event of a particular id, you can call the getLastEventById method, which will return an object with the information of that event, including the type.

`getEventsById` returns the events in chronological order, `getLastEventById` returns the chronologically last one, and `getIdTimeByType` returns the `time` of the chronologically last one of that type. Storage order is not guaranteed, so the three sort by `time` and discard records with an invalid `time` (a single corrupted date would otherwise leave the whole read unsorted). `getNetTrackingTime` does the same with the events it receives.

`getEventsById` also returns a valid sequence: it drops the events the sequence rejects after the previous one, like the stacked `finish` events that a database written by the 2.x versions keeps. A run of repeated events keeps its first one, the same reading `getNetTrackingTime` does, so a dirty history under-counts instead of inflating.

`searchEventByQuery` is the exception: it returns the records as the query yields them, in storage order unless the query itself sorts. If order matters, sort in the query (`searchEventByQuery('id == $0 SORT(time ASC)', id)`) or use the methods above.