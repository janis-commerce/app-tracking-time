# @janiscommerce/app-tracking-time
![janis-logo](brand-logo.png)

This package manages events in your application by interacting with a database. It provides functionalities to add, retrieve, and validate events. Also handles application state changes to pause ongoing events when the app goes into the background.

## Dependencies

To ensure the proper functioning of this library, make sure that the following dependencies are installed in your project:

### Required Peer Dependencies

- **`date-fns`**: `>=2.0.0 <3.0.0`
- **`react`**: `>=18.2.0`
- **`react-native`**: `>=0.71.5`
- **`realm`**: `^11.0.0`

These dependencies are required for the library to work correctly. Ensure that your project has these versions installed to avoid compatibility issues.

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

const saveInitEvent = async (id) => {
    try {
        await EventTracker.addEvent({id,type:'start'})
    } catch(error) {
        console.warn(error);
    }
}


<Button title='save new event' onPress={() => saveInitEvent('66e99577e128deb19d57cd74')}/>
```

This action will save a start type event associated with the id 66e99577e128deb19d57cd74


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

### Pause all tracked ids when the app goes into the background.

To save a pause event for all followed ids, you can use startListening and stopListening methods.

These methods are listeners that are responsible for detecting the change of state of the application. When the app enters the background, they execute a massive action that is responsible for stopping the tracking of all the IDs that are registered up to that moment in the database.

The best way to use it would be to call a useEffect hook on some component that, if possible, is not unmounted until the application goes into the background or is closed.

```js
useEffect(() => {
    EventTracker.startListening();

    return () => {
        EventTracker.stopListening();
    }
},[])
```

The cleanup method will be called once the component is unmounted and will unlisten for state changes from the app.
If any of the events you want to pause is already paused, what will happen is that the console will throw a warning with the error reported by the package.

### Sequence of recorded events

The package has internal validations that prevent events from being saved consecutively or that do not have coherence depending on the event that has been saved prior to this one.
For example, you will not be able to store 2 pause type events consecutively. Additionally, saving any event related to an ID that has already been finished is also not allowed.

If you want to know what was the last event that was stored for a particular id, you can call the getLastEventById method, which will return an object with the information of the last stored event, including the type.