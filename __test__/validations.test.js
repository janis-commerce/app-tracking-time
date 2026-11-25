import Validations from '../utils/validations';
import {EVENT_TYPES} from '../lib/event-tracker';
import {VALID_EVENT_TYPES, OPENER_TYPES, CLOSER_TYPES} from '../utils/eventTypes';

describe('Validations', () => {
	describe('EVENT_TYPES', () => {
		it('is exported from the package entry point without shadowing the default export', () => {
			expect(EVENT_TYPES).toStrictEqual({
				START: 'start',
				PAUSE: 'pause',
				RESUME: 'resume',
				FINISH: 'finish',
			});
		});

		it('derives the valid, opener and closer type lists from the same vocabulary', () => {
			expect(VALID_EVENT_TYPES).toStrictEqual(['start', 'pause', 'resume', 'finish']);
			expect(OPENER_TYPES).toStrictEqual(['start', 'resume']);
			expect(CLOSER_TYPES).toStrictEqual(['pause', 'finish']);
		});
	});

	describe('normalizeEventType', () => {
		it.each(['START', 'Start', 'sTaRt'])('lowercases %s', (type) => {
			expect(Validations.normalizeEventType(type)).toBe('start');
		});

		it.each([undefined, null, '', 123, {}])('returns an empty string for %p', (type) => {
			expect(Validations.normalizeEventType(type)).toBe('');
		});
	});

	describe('isValidEventType', () => {
		it.each(['start', 'pause', 'resume', 'finish', 'START'])('accepts %s', (type) => {
			expect(Validations.isValidEventType(type)).toBe(true);
		});

		it('rejects an unknown type', () => {
			expect(Validations.isValidEventType('started')).toBe(false);
		});

		it.each([undefined, null, 123])('returns false for the non-string type %p', (type) => {
			expect(Validations.isValidEventType(type)).toBe(false);
		});
	});

	describe('idValidation', () => {
		it('returns the id when it is a valid string', () => {
			expect(Validations.idValidation('123')).toBe('123');
		});

		it.each([null, '', 123])('throws with invalid id %s', (id) => {
			expect(() => Validations.idValidation(id)).toThrow('ID is invalid or null');
		});
	});

	describe('isValidISOString', () => {
		it('accepts a canonical ISO string with milliseconds and Z suffix', () => {
			expect(Validations.isValidISOString('2026-07-30T10:00:00.000Z')).toBe(true);
		});

		it('rejects a string that matches the format but is not a real date', () => {
			expect(Validations.isValidISOString('2026-02-30T10:00:00.000Z')).toBe(false);
		});

		it.each(['not-a-date', '2026-07-30 10:00:00', '2026-07-30T10:00:00.000-03:00'])(
			'rejects the non-canonical format %s',
			(date) => {
				expect(Validations.isValidISOString(date)).toBe(false);
			},
		);
	});

	describe('validateEventsSequence (multi-cycle state machine)', () => {
		describe('start', () => {
			it.each([undefined, 'finish'])('allows start when the previous event is %s', (previous) => {
				expect(() => Validations.validateEventsSequence('start', previous)).not.toThrow();
			});

			it('rejects start over an open cycle (previous start)', () => {
				expect(() => Validations.validateEventsSequence('start', 'start')).toThrow(
					'only one start record is allowed per cycle',
				);
			});

			it.each(['pause', 'resume'])(
				'rejects start while a cycle is in progress (previous %s)',
				(previous) => {
					expect(() => Validations.validateEventsSequence('start', previous)).toThrow(
						'there is a cycle in progress',
					);
				},
			);
		});

		describe('pause', () => {
			it.each(['start', 'resume'])('allows pause when the previous event is %s', (previous) => {
				expect(() => Validations.validateEventsSequence('pause', previous)).not.toThrow();
			});

			it('rejects pause when the record is already paused', () => {
				expect(() => Validations.validateEventsSequence('pause', 'pause')).toThrow(
					'record is already paused',
				);
			});

			it.each([undefined, 'finish'])('rejects pause when the previous event is %s', (previous) => {
				expect(() => Validations.validateEventsSequence('pause', previous)).toThrow(
					"record can't be paused",
				);
			});
		});

		describe('resume', () => {
			it('allows resume when the record is paused', () => {
				expect(() => Validations.validateEventsSequence('resume', 'pause')).not.toThrow();
			});

			it('rejects resume when the record is already being continued', () => {
				expect(() => Validations.validateEventsSequence('resume', 'resume')).toThrow(
					'the record is already being continued',
				);
			});

			it.each(['start', 'finish', undefined])(
				'rejects resume when the previous event is %s',
				(previous) => {
					expect(() => Validations.validateEventsSequence('resume', previous)).toThrow(
						"record wasn't paused",
					);
				},
			);
		});

		describe('finish', () => {
			it.each(['start', 'pause', 'resume'])(
				'allows finish when the previous event is %s',
				(previous) => {
					expect(() => Validations.validateEventsSequence('finish', previous)).not.toThrow();
				},
			);

			it('rejects finish when the record was never started', () => {
				expect(() => Validations.validateEventsSequence('finish', undefined)).toThrow(
					"record wasn't started",
				);
			});

			it('rejects finish over an already finished record', () => {
				expect(() => Validations.validateEventsSequence('finish', 'finish')).toThrow(
					'record is already finished',
				);
			});
		});

		describe('normalization', () => {
			it('validates an uppercase type instead of letting it through unchecked', () => {
				expect(() => Validations.validateEventsSequence('START', 'start')).toThrow(
					'only one start record is allowed per cycle',
				);
			});

			it('normalizes the previous type read from storage', () => {
				expect(() => Validations.validateEventsSequence('resume', 'PAUSE')).not.toThrow();
			});

			it.each(['started', undefined, 123])('rejects the unknown type %p', (type) => {
				expect(() => Validations.validateEventsSequence(type, 'start')).toThrow(
					'Event type is invalid',
				);
			});
		});
	});

	describe('getValidSequence', () => {
		const at = (minute) => `2023-01-01T00:${String(minute).padStart(2, '0')}:00.000Z`;
		const typesOf = (events) => events.map(({type}) => type);

		it('returns an empty sequence when it does not receive an array', () => {
			expect(Validations.getValidSequence(undefined)).toStrictEqual([]);
		});

		it('keeps a valid multi-cycle sequence as it is, in chronological order', () => {
			const events = [
				{type: 'finish', time: at(20)},
				{type: 'start', time: at(0)},
				{type: 'pause', time: at(1)},
				{type: 'resume', time: at(2)},
				{type: 'finish', time: at(3)},
				{type: 'start', time: at(10)},
			];

			expect(typesOf(Validations.getValidSequence(events))).toStrictEqual([
				'start',
				'pause',
				'resume',
				'finish',
				'start',
				'finish',
			]);
		});

		it.each([
			[
				'finish',
				[
					{type: 'start', time: at(0)},
					{type: 'finish', time: at(1)},
					{type: 'finish', time: at(2)},
				],
			],
			[
				'start',
				[
					{type: 'start', time: at(0)},
					{type: 'start', time: at(1)},
					{type: 'finish', time: at(2)},
				],
			],
			[
				'pause',
				[
					{type: 'start', time: at(0)},
					{type: 'pause', time: at(1)},
					{type: 'pause', time: at(2)},
				],
			],
		])('keeps the first of repeated %s events', (type, events) => {
			const sequence = Validations.getValidSequence(events);

			expect(sequence.filter((event) => event.type === type)).toStrictEqual([
				events.find((event) => event.type === type),
			]);
		});

		it('drops the events with an invalid time or that break the sequence', () => {
			const events = [
				{type: 'finish', time: at(0)},
				{type: 'start', time: at(1)},
				{type: 'resume', time: at(2)},
				{type: 'finish', time: 'garbage'},
				{type: 'finish', time: at(3)},
			];

			expect(typesOf(Validations.getValidSequence(events))).toStrictEqual(['start', 'finish']);
		});

		it('reads uppercase types like lowercase ones', () => {
			const events = [
				{type: 'START', time: at(0)},
				{type: 'FINISH', time: at(1)},
				{type: 'FINISH', time: at(2)},
			];

			expect(typesOf(Validations.getValidSequence(events))).toStrictEqual(['START', 'FINISH']);
		});
	});
});
