import Event from './event';
import EventTrackerError from './event-tracker-error';
import Database from './database';
import Validations from '../utils/validations';
import Helpers from '../utils/helpers';
import { AppState } from 'react-native';

/**
 * Manages events, including adding, retrieving, and validating them.
 * 
 * @class
 * @description The `EventTracker` class provides functionality for managing events, including adding new events,
 *              validating event sequences, and retrieving event data. It interacts with the `Database` class to
 *              perform operations on the event records.
 */


class EventTracker{

    /**
     * @param {string} filename - The name of the database file used by the `EventTracker` instance.
     */

    constructor(filename) {
        this.db = new Database(filename);
        this.appCurrentState = AppState.currentState;
        this._handleAppStateChange = this._handleAppStateChange.bind(this);
        this._hasTrackingFolder = null;

        this._checkFolderState();
    }

    get hasFolder() {
        return this._hasTrackingFolder;
    }

    set hasFolder(bool) {
        this._hasTrackingFolder = bool;
        this._handleFolderStateChange();
    }
    /**
     * Adds an event to the database after performing validations.
     * 
     * @async
     * @name addEvent
     * @param {{id: string, type: string, time: string, payload: object}} params
     * @param {string} params.id 
     * @param {"start"|"pause"|"resume"|"finish"}  params.type
     * @param {string} params.time current time in isoString format
     * @param {object} params.payload any data that you want to save associated with the id and type
     * @returns {Promise<{id: string, time: number}>} A promise that resolves to an object containing the `id` of the event and the `time` the event was created.
     * @throws {Error} If any validation fails or the event cannot be saved to the database.
     */

    async addEvent(params) {
        try {
            const {id, type, time, payload} = params;
            await Validations.idValidation(id);
            
            await this._eventValidation(id, type)

            const createdEvent = Event.create(id, type, time, payload);

            await this.db.save(createdEvent);

            return {
                id,
                time: createdEvent.time,
            }
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * @name addManyEvents
     * @description This method allows create the same event for multiple IDs.
     * @param {string[]} ids 
     * @param {string} type 
     * @returns {Promise<{createdEvents: {id: string, time: string}[], errors: {id: string, error: string}[]}>}
     */

    async addManyEvents(ids, type) {
        try {
            if(!ids || !Helpers.isArray(ids)) throw new EventTrackerError(`an array of ids was expected`)

            let createdEvents = [];
            let errors = [];

            for(const id of ids) {
                const [savedEvent, error] = await Helpers.promiseWrapper(
                    this.addEvent({id,type})
                )

                if(error) {
                    errors.push({id, error: error?.message})
                    continue;
                }

                createdEvents.push(savedEvent)
            }

            return {
                createdEvents,
                errors
            }
        } catch (error) {
            return Promise.reject(error);
        }
    }

     /**
     * @name getEventsById
     * @description This method allows you to obtain all the events related to the id
     * @param {string} id 
     * @returns {Promise<{id: string, time: string, payload: object, type: string}[]}>}
     */

    async getEventsById (id) {
        try {
            await Validations.idValidation(id);

            const filters = Helpers.getFilters({id});

            const events = await this.db.search(filters,id);
            
            return events.map((e) => Event.parseEventFromDB(e));
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Retrieves the last event associated with a given ID.
     * 
     * @name getLastEventById 
     * @param {string} id - The ID for which to retrieve the last event type.
     * @returns {Promise<{id: string, time: string, payload: object, type: string}>} A promise that resolves to the last event, or an empty string if no event is found.
     * @throws {Error} If the ID is invalid or an error occurs during the search process.
     */

    async getLastEventById(id) {
        try {
            await Validations.idValidation(id);
        
            const filters = Helpers.getFilters({id});
            const events = await this.db.search(filters, id)
            let registerEvents = Helpers.reverseArray(events);
            const findedEvent = registerEvents[0];
            
            if(!findedEvent) return {};

            return Event.parseEventFromDB(findedEvent);
        } catch (error) {
            return Promise.reject(error);
        }
    }   

    /**
     *  Calculates the elapsed time between the start and finish events for a given ID.
     * 
     * @name getElapsedTimeById
     * @param {string} id - The ID for which to calculate the elapsed time.
     * @returns {Promise<{days: number, hours: number ,minutes: number, seconds: number}>} A promise that resolves to the elapsed time in milliseconds.
     * @throws {EventTrackerError} If the ID has not been tracked, or if no start event is found.
     * @throws {Error} If an error occurs during validation or while retrieving the events.
     */

    async getElapsedTimeById (id) {
        try {
            await Validations.idValidation(id);
            const events = await this.getEventsById(id);

            if(!events?.length) throw new EventTrackerError('ID was not tracked');

            const startEvent = events.find((e) => e.type === 'start');

            if(!startEvent || !Object.keys(startEvent).length) throw new EventTrackerError('ID was not tracked')

            const endEvents = events.filter((e) => e.type === 'finish');
            const lastEndEvent = Helpers.reverseArray(endEvents)[0]

            const startTime = startEvent.time;
            const currentTime = !!lastEndEvent?.time ?  lastEndEvent.time : new Date().toISOString();

            const elapsedTime = Helpers.getTimeDifference(startTime, currentTime);

            return elapsedTime;

        } catch (error) {
            return Promise.reject(error);
        }
    }

    getElapsedTime (startTime, finishTime) {
        
        if(!startTime) return {
            days:0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        }

        const lastTime = !!finishTime ? finishTime : new Date().toISOString();

        return Helpers.getTimeDifference(startTime, lastTime);
    }

    /**
     * Checks if an event with the given ID has already started.
     * 
     * @async
     * @name isEventStarted
     * @description This method searches for a "start" event associated with the provided ID. 
     *              If a start event is found, it returns `true`, indicating the event has already started.
     *              If no start event is found, it returns `false`.
     * @param {string} id - The ID of the event to check.
     * @returns {Promise<boolean>} A promise that resolves to `true` if a start event exists, or `false` if not.
     * @throws {EventTrackerError} If the ID is invalid.
     * @throws {Error} If an error occurs during the search process.
     */

    async isEventStarted (id) {
        try {
            await Validations.idValidation(id);

            const filters = Helpers.getFilters({id,type: 'start'})

            const startEvents = await this.db.search(filters, id, 'start');

            if(!startEvents.length) return false;

           return true;

        } catch (error) {
            return Promise.reject(error)
        }
    }

    /**
     * Pauses all active events when the application moves to the background.
     * 
     * @async
     * @private
     * @name _stopEventsInBackground
     * @description This method retrieves all active event IDs and pauses them by adding a "pause" event for each. 
     *              It logs any errors encountered while pausing individual events and returns a list of saved timers.
     * @returns {Promise<Array<string|null>>} A promise that resolves to an array of saved timer events or `null` if no IDs are found.
     * @throws {EventTrackerError} If an error occurs while retrieving IDs or saving events.
     */
    
    async _stopEventsInBackground () {
        const stoppedTypes  = ['pause','finish'];
        let stoppedEvents = [];

        try {
            const ids = await this._getAllIds()

            if(!ids.length) return stoppedEvents;

        for(const id of ids) {
                const [lastEvent, lastEventError] = await Helpers.promiseWrapper(
                    this.getLastEventById(id)
                );

                if(lastEventError) {
                    console.warn(lastEventError)
                }

                if(stoppedTypes.includes(lastEvent?.type)) continue;

                const [savedEvent, saveError] = await Helpers.promiseWrapper(
                    this.addEvent({
                        id,
                        type: 'pause'
                    })
                )

                if(saveError) {
                    console.warn(saveError)
                    continue;
                }
                stoppedEvents.push(savedEvent);
            }

            return stoppedEvents;
        } catch (error) {
           const customError = new EventTrackerError(error);
           
           return Promise.reject(customError)
        }
    }

    /**
     * Handles changes in the application state and performs actions based on the new state.
     * 
     * @async
     * @name _handleAppStateChange
     * @param {string} nextAppState - The next application state, e.g., 'active', 'background', etc.
     * @description This method is triggered when the application state changes. If the app transitions from an active or foreground 
     *              state to the background, it will pause ongoing events by calling `_stopEventsInBackground`. It then updates the 
     *              `appCurrentState` to the new state.
     * @returns {Promise<void>} A promise that resolves when the state change handling is complete.
     * @throws {EventTrackerError} If an error occurs while stopping events in the background.
     */
    /*istanbul ignore next*/
    async _handleAppStateChange(nextAppState) {
        try {
            if (this.appCurrentState.match(/active|foreground/) && nextAppState === 'background') {

              await this._stopEventsInBackground();
            }
            this.appCurrentState = nextAppState;
        } catch(error) {
            const customError = new EventTrackerError(error);

            return Promise.reject(customError);
        }
      }

    /**
     * Starts listening for changes in the application state.
     * 
     * @name startListening
     * @description Adds an event listener to monitor changes in the application state and calls `_handleAppStateChange` 
     *              when the state changes.
     * @returns {void}
     */

      /*istanbul ignore next*/
    startListening() {
    AppState.addEventListener('change', this._handleAppStateChange);
    }

    /**
     * Stops listening for changes in the application state.
     * 
     * @name stopListening
     * @description Removes the event listener that monitors changes in the application state and was calling `_handleAppStateChange`.
     * @returns {void}
     */

    /*istanbul ignore next*/
    stopListening() {
    AppState.removeEventListener('change', this._handleAppStateChange);
    }

    /**
     * Deletes all events associated with the given ID from the database.
     * 
     * @async
     * @name deleteEventsById
     * @description This method deletes all events related to the specified ID by applying filters to the database query.
     * @param {string} id - The ID of the events to be deleted.
     * @returns {Promise<void>} A promise that resolves when the events are successfully deleted.
     * @throws {EventTrackerError} If the ID is invalid.
     * @throws {Error} If an error occurs during the deletion process.
     */

    async deleteEventsById (id) {
        try {
            await Validations.idValidation(id);

            const filters = Helpers.getFilters({id});

            await this.db.delete(filters, id);
            
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
    * Delete all records from the database 
    * @name deleteAllEvents
    * @returns {Promise<void>} A promise that resolves when the events are successfully deleted.
    */
    async deleteAllEvents () {
        try {
            await this.db.deleteAll();
        } catch(error) {
            return Promise.reject(error);
        }
    }

    /**
     * Asynchronously removes a record with the specified `id` and type 'finish' from the database.
     *
     * @param {string} id - The unique identifier of the record to be removed.
     * @returns {Promise<boolean>} - A promise that resolves to `true` if the deletion was successful.
     * @throws {Error} - If an error occurs during the deletion process, the promise is rejected with the error.
     */

    async removeFinishById (id) {
        try {
            return await this.db.delete('id LIKE[c] $0 && type = $1', String(id), 'finish');
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Retrieves all unique event IDs from the database.
     * 
     * @async
     * @private
     * @name _getAllIds
     * @description This method queries the database to fetch all events, extracts their IDs, and returns a list of unique IDs. 
     *              It ensures that duplicate IDs are removed from the result.
     * @returns {Promise<string[]>} A promise that resolves to an array of unique event IDs.
     * @throws {Error} If an error occurs during the retrieval process.
     */

    async _getAllIds() {
        try {
            const events = await this.db.search();
            const ids = events.map((ev) => (ev.id));
            const uniqueIds = [...new Set(ids)];

            return uniqueIds;
        } catch (error) {
            return Promise.reject(error)
        }
    }

    /**
     * Validates the event type and checks if it follows the correct sequence for the given ID.
     * 
     * @async
     * @private
     * @name _eventValidation
     * @description This method first validates the event type to ensure it is valid. It then retrieves the type of the last event 
     *              associated with the provided ID and checks if the new event type follows the correct sequence.
     * @param {string} id - The ID of the event to validate.
     * @param {string} type - The type of the new event to validate.
     * @returns {Promise<boolean>} A promise that resolves to `true` if the event type is valid and follows the correct sequence, 
     *                             or `false` otherwise.
     * @throws {EventTrackerError} If the event type is invalid or if the event sequence is incorrect.
     * @throws {Error} If an error occurs during the validation process.
     */

    async _eventValidation (id,type) {
        if(!Validations.isValidEventType(type)) throw new EventTrackerError('Event type is invalid')

        const {type:previousType} = await this.getLastEventById(id)

        return Validations.validateEventsSequence(type, previousType);
    }

    async _getIdTimeByType (id,type) {
        try {
            const filters = Helpers.getFilters({id, type});

            const filteredEvents = await this.db.search(filters, id, type);

            const lastIndex = filteredEvents.length - 1;
            const lastEvent = filteredEvents[lastIndex];
            const event = Event.parseEventFromDB(lastEvent);

            if(!Helpers.isObject(event) || !Object.keys(event).includes('time')) return null;

            return event.time;

        } catch (error) {
            return Promise.reject(error);
        }
    }

    async getTimeRangeById (id) {
        try {
            await Validations.idValidation(id);

            const [startTime, startTimeError] = await Helpers.promiseWrapper(
                this._getIdTimeByType(id,'start')
            );

            const [finishTime, finishTimeError] = await Helpers.promiseWrapper(
                this._getIdTimeByType(id,'finish')
            );

            return {
                startTime: !startTimeError ? startTime : null,
                finishTime: !finishTimeError ? finishTime : null,
            }
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async wipeDatabase () {
        try {
            await this.db.removeDatabaseFolder();

            this.hasFolder = false;
        } catch (error) {
            return Promise.reject(error)
        }
    }

    async _handleFolderStateChange() {
        if(this._hasTrackingFolder) return null;
        
        try {
            await this.db.createDatabaseFolder()
            this.hasFolder = true;
        } catch (error) {
            return null;
        }
    }

    async _checkFolderState() {
        try {
            this.hasFolder = await this.db.isFolderExist();
        } catch (error) {
            this.hasFolder = false;
        }
    }
}

export default EventTracker; 