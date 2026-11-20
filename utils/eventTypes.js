/**
 * Canonical event vocabulary of the package. Exported from the entry point so
 * consumers reference the same constants the state machine and the net time
 * calculation use, instead of repeating the literals on their side.
 */
export const EVENT_TYPES = {
	START: 'start',
	PAUSE: 'pause',
	RESUME: 'resume',
	FINISH: 'finish',
};

export const VALID_EVENT_TYPES = Object.values(EVENT_TYPES);

/** Types that open an active span, and the ones that close it. */
export const OPENER_TYPES = [EVENT_TYPES.START, EVENT_TYPES.RESUME];

export const CLOSER_TYPES = [EVENT_TYPES.PAUSE, EVENT_TYPES.FINISH];
