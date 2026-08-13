import EventTrackerError from '../lib/event-tracker-error';
import Helpers from './helpers';
import {EVENT_TYPES, VALID_EVENT_TYPES} from './eventTypes';

class Validations {
	/**
	 * @name normalizeEventType
	 * @description lowercases the type so validation, storage and time calculation
	 * all work on the same value. Anything that is not a string normalizes to ''.
	 * @param {string} type
	 * @returns {string}
	 */
	static normalizeEventType(type) {
		if (!Helpers.isString(type)) return '';

		return type.toLowerCase();
	}

	/**
	 * @name isValidEventType
	 * @description returns a boolean indicating whether the type is valid or not
	 * @param {string} type
	 * @returns {boolean}
	 *
	 * @example
	 *  Event.isValidEventType('start') => true;
	 *  Event.isValidEventType('START') => true;
	 *  Event.isValidEventType('started') => false;
	 */
	static isValidEventType(type) {
		return VALID_EVENT_TYPES.includes(this.normalizeEventType(type));
	}

	static idValidation(id) {
		if (!id || !Helpers.isString(id)) throw new EventTrackerError('ID is invalid or null');

		return id;
	}

	static isValidISOString(date) {
		const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
		if (!isoRegex.test(date)) return false;

		const parsedDate = new Date(date);
		return parsedDate.toISOString() === date;
	}

	/**
	 * Multi-cycle sequence: a record can hold N `start → finish` cycles.
	 * `start` opens a new cycle (first event or right after a `finish`);
	 * `pause`/`resume` only apply within an open cycle; `finish` closes it.
	 * Both types are normalized: an unnormalized value used to match no `case`,
	 * which let any event through without validating the sequence at all.
	 */
	static validateEventsSequence(currentType, lastType = '') {
		const type = this.normalizeEventType(currentType);
		const previousType = this.normalizeEventType(lastType);

		switch (type) {
			case EVENT_TYPES.START:
				if (previousType === EVENT_TYPES.START)
					throw new EventTrackerError(
						`Forbidden event: only one start record is allowed per cycle`,
					);

				if (previousType === EVENT_TYPES.PAUSE || previousType === EVENT_TYPES.RESUME)
					throw new EventTrackerError(`Forbidden event: there is a cycle in progress`);
				break;

			case EVENT_TYPES.PAUSE:
				const validPreviousTypes = [EVENT_TYPES.START, EVENT_TYPES.RESUME];

				if (previousType === EVENT_TYPES.PAUSE)
					throw new EventTrackerError(`Forbidden event: record is already paused`);

				if (!previousType || !validPreviousTypes.includes(previousType))
					throw new EventTrackerError("Forbidden event: record can't be paused");
				break;

			case EVENT_TYPES.RESUME:
				if (previousType === EVENT_TYPES.RESUME)
					throw new EventTrackerError(`Forbidden event: the record is already being continued`);

				if (previousType !== EVENT_TYPES.PAUSE)
					throw new EventTrackerError("Forbidden event: record wasn't paused");
				break;

			case EVENT_TYPES.FINISH:
				if (previousType === '')
					throw new EventTrackerError(`Forbidden event: record wasn't started`);

				if (previousType === EVENT_TYPES.FINISH)
					throw new EventTrackerError(`Forbidden event: record is already finished`);
				break;

			default:
				throw new EventTrackerError('Event type is invalid');
		}
	}
}

export default Validations;
