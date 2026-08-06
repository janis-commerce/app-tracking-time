import Event from './event';
import EventTrackerError from './event-tracker-error';
import Database from './database';
import Validations from '../utils/validations';
import Helpers from '../utils/helpers';
import {EVENT_TYPES, OPENER_TYPES, CLOSER_TYPES} from '../utils/eventTypes';
import {differenceInMilliseconds} from 'date-fns';

/**
 * Manages events, including adding, retrieving, and validating them.
 *
 * @class
 * @description The `EventTracker` class provides functionality for managing events, including adding new events,
 *              validating event sequences, and retrieving event data. It interacts with the `Database` class to
 *              perform operations on the event records.
 */

class EventTracker {
	/**
	 * @param {string} filename - The name of the database file used by the `EventTracker` instance.
	 */

	constructor(filename) {
		this.db = new Database(filename);
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

			await this._eventValidation(id, type);

			const createdEvent = Event.create(id, type, time, payload);

			await this.db.save(createdEvent);

			return {
				id,
				time: createdEvent.time,
			};
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

	async getEventsById(id) {
		try {
			await Validations.idValidation(id);

			const filters = Helpers.getFilters({id});

			const events = await this.db.search(filters, id);

			// El orden de storage no está garantizado: se devuelve orden cronológico
			// para que ningún consumer tenga que re-ordenar por su cuenta
			return events
				.map((e) => Event.parseEventFromDB(e))
				.sort((a, b) => new Date(a?.time) - new Date(b?.time));
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
			const events = await this.db.search(filters, id);

			// El orden de storage no está garantizado (mismo criterio que getNetTrackingTime):
			// se ordena por time para que "último evento" sea el cronológico, no el de la tabla
			const sortedEvents = [...events].sort((a, b) => new Date(a?.time) - new Date(b?.time));
			const findedEvent = sortedEvents[sortedEvents.length - 1];

			if (!findedEvent) return {};

			return Event.parseEventFromDB(findedEvent);
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 *  Calculates the elapsed time between the start and finish events.
	 *  When not receive  finish time, it calculates the difference with the current time
	 *
	 * @name getElapsedTime
	 * @param {{startTime, finishTime, format}} param
	 * @param {string} startTime start time in iso string format
	 * @param {string} finishTime finish time in iso string format
	 * @param {boolean} format if true, returns the time in days-hours-minutes-seconds format, otherwise returns only the milliseconds
	 * @returns {{days: number, hours: number ,minutes: number, seconds: number}} formated elapsed time
	 */

	getElapsedTime({startTime, finishTime, format = true}) {
		if (!startTime)
			return format
				? {
						days: 0,
						hours: 0,
						minutes: 0,
						seconds: 0,
					}
				: 0;

		const lastTime = !!finishTime ? finishTime : new Date().toISOString();

		return Helpers.getTimeDifference(startTime, lastTime, format);
	}

	/**
	 *  Calculates the time elapsed between each pause and resume of an id.
	 *
	 * @name getStoppedTime
	 * @param {{id: string, time: string, payload: object, type: string}[]} events events associated with an id
	 * @param {boolean} format if true, returns the time in days-hours-minutes-seconds format, otherwise returns only the milliseconds
	 * @returns {{days: number, hours: number ,minutes: number, seconds: number}} formated stopped time
	 */

	//istanbul ignore next
	getStoppedTime({events = [], format = false}) {
		if (!events?.length || !Helpers.isArray(events)) return 0;

		const stoppedTime = events.reduce((totalPausedTime, currentEvent, index) => {
			if (currentEvent.type !== 'pause') return totalPausedTime;

			let nextEvent = events[index + 1] || {};

			if (nextEvent.type === 'pause') return totalPausedTime;

			if (nextEvent.type !== 'resume' && nextEvent.type !== 'finish') {
				nextEvent.time = new Date();
			}

			const resumeTime = new Date(nextEvent.time);
			const pauseTime = new Date(currentEvent.time);
			const timeDifference = differenceInMilliseconds(resumeTime, pauseTime);

			return totalPausedTime + timeDifference;
		}, 0);

		if (format) return Helpers.convertMillisecondsToTime(stoppedTime);

		return stoppedTime;
	}

	/**
	 * Calculates the net active time by summing every active span, supporting
	 * multiple `start → finish` cycles per record.
	 *
	 * Each span opens on a `start` or `resume` and closes on the next
	 * `pause` or `finish`. A trailing open span (record in progress) is not
	 * counted — compute against `now` on the caller side if live time is needed.
	 * Events are sorted by time internally (storage order is not guaranteed) and
	 * events with an invalid time are ignored. If the device clock regresses
	 * BETWEEN cycles the interleaved spans degrade to an under-count — never an
	 * over-count.
	 *
	 * @name getNetTrackingTime
	 * @param {Array<{type: string, time: string}>} events tracked events
	 * @param {boolean} format if true, returns the time in days-hours-minutes-seconds format, otherwise returns only the milliseconds
	 * @returns {{days: number, hours: number ,minutes: number, seconds: number}|number} formated net time
	 */

	getNetTrackingTime({events = [], format = false}) {
		if (!events?.length || !Helpers.isArray(events)) return format ? Helpers.convertMillisecondsToTime(0) : 0;

		const sortedEvents = events
			.filter((event) => !Number.isNaN(new Date(event?.time).getTime()))
			.sort((a, b) => new Date(a.time) - new Date(b.time));

		let openedAt = null;
		const netTime = sortedEvents.reduce((total, event) => {
			if (OPENER_TYPES.includes(event?.type) && !openedAt) {
				openedAt = event.time;
				return total;
			}

			if (CLOSER_TYPES.includes(event?.type) && openedAt) {
				const spanTime = differenceInMilliseconds(new Date(event.time), new Date(openedAt));
				openedAt = null;
				return total + spanTime;
			}

			return total;
		}, 0);

		const safeNetTime = !netTime || netTime <= 0 ? 0 : netTime;

		if (format) return Helpers.convertMillisecondsToTime(safeNetTime);

		return safeNetTime;
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

	async isEventStarted(id) {
		try {
			await Validations.idValidation(id);

			const filters = Helpers.getFilters({id, type: EVENT_TYPES.START});

			const startEvents = await this.db.search(filters, id, EVENT_TYPES.START);

			if (!startEvents.length) return false;

			return true;
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Generic search method that can be applied to any situation.
	 * Allows searching events with custom queries and parameters.
	 *
	 * @async
	 * @name searchEventByQuery
	 * @description This method provides a flexible way to search events using custom queries and parameters.
	 *              It delegates the search operation to the database layer while providing error handling.
	 * @param {string} query - The search query/filter to apply. Can be empty for all events.
	 * @param {...any} values - Variable number of values to use in the query (for parameterized queries).
	 * @returns {Promise<Array>} A promise that resolves to an array of matching events.
	 * @throws {EventTrackerError} If the database filename is not specified or other database errors occur.
	 * @example
	 * // Search all events
	 * const allEvents = await eventTracker.searchEventByQuery();
	 *
	 * // Search by ID
	 * const eventsById = await eventTracker.searchEventByQuery('id == $0', 'user123');
	 *
	 * // Search by type
	 * const startEvents = await eventTracker.searchEventByQuery('type == $0', 'start');
	 *
	 * // Complex query
	 * const recentEvents = await eventTracker.searchEventByQuery(
	 *   'id == $0 && type == $1 && time >= $2',
	 *   'user123', 'start', new Date('2024-01-01')
	 * );
	 */

	async searchEventByQuery(query = '', ...values) {
		try {
			const events = await this.db.search(query, ...values);

			return events.map((e) => Event.parseEventFromDB(e));
		} catch (error) {
			return Promise.reject(error);
		}
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

	async deleteEventsById(id) {
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
	async deleteAllEvents() {
		try {
			await this.db.deleteAll();
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Asynchronously removes a record with the specified `id` and type 'finish' from the database.
	 *
	 * @deprecated Removing finish events corrupts multi-cycle histories: it deletes EVERY
	 * finish of the id (not just the latest), losing already-closed cycles. To rework a
	 * finished record, open a new cycle by adding a `start` event instead of deleting.
	 * @param {string} id - The unique identifier of the record to be removed.
	 * @returns {Promise<boolean>} - A promise that resolves to `true` if the deletion was successful.
	 * @throws {Error} - If an error occurs during the deletion process, the promise is rejected with the error.
	 */

	async removeFinishById(id) {
		try {
			const dbFilters = 'id LIKE[c] $0 && type = $1';
			return await this.db.delete(dbFilters, String(id), EVENT_TYPES.FINISH);
		} catch (error) {
			return Promise.reject(error);
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

	async _eventValidation(id, type) {
		if (!Validations.isValidEventType(type)) throw new EventTrackerError('Event type is invalid');

		const {type: previousType} = await this.getLastEventById(id);

		return Validations.validateEventsSequence(type, previousType);
	}

	/**
	 * Retrieves the `time` property of the last event matching the specified ID and type.
	 *
	 * @async
	 * @param {string|number} id - The identifier used to filter events.
	 * @param {string} type - The type used to filter events.
	 * @returns {Promise<number|null>} Resolves with the `time` property of the last matching event, or `null` if no valid event is found.
	 * @throws {Error} If an error occurs during the search process, the promise is rejected with the error.
	 */

	async getIdTimeByType(id, type) {
		try {
			await Validations.idValidation(id);

			const isValidType = Validations.isValidEventType(type);
			if (!isValidType) throw new EventTrackerError('Event type is invalid');

			const filters = Helpers.getFilters({id, type});

			const filteredEvents = await this.db.search(filters, id, type);

			// El orden de storage no está garantizado (mismo criterio que getLastEventById):
			// el "último" evento del tipo es el cronológico, no el de la tabla
			const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a?.time) - new Date(b?.time));

			const lastIndex = sortedEvents.length - 1;
			const event = sortedEvents[lastIndex];

			if (!event) return null;

			const parsedEvent = Event.parseEventFromDB(event);

			if (!Helpers.isObject(parsedEvent) || !parsedEvent['time']) return null;

			return parsedEvent['time'];
		} catch (error) {
			return Promise.reject(error);
		}
	}

	/**
	 * Deletes the database folder and updates the folder existence flag.
	 *
	 * @async
	 * @returns {Promise<void>} Resolves when the database folder is successfully removed.
	 * @throws {Error} If an error occurs during the folder removal process, the promise is rejected with the error.
	 */

	async removeEventsFolder() {
		try {
			await this.db.removeDatabaseFolder();

			return true;
		} catch (error) {
			return Promise.reject(error);
		}
	}
}

export {EVENT_TYPES};

export default EventTracker;
