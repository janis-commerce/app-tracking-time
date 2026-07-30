import Event from '../lib/event';

describe('Event', () => {
	describe('create', () => {
		it('keeps a valid ISO time and object payload', () => {
			const event = Event.create('123', 'start', '2026-07-30T10:00:00.000Z', {a: 1});

			expect(event).toStrictEqual({
				id: '123',
				type: 'start',
				time: '2026-07-30T10:00:00.000Z',
				payload: {a: 1},
			});
		});

		it('replaces an invalid time with the current time and an invalid payload with an empty object', () => {
			const event = Event.create('123', 'start', 'not-a-date', 'not-an-object');

			expect(event.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(event.payload).toStrictEqual({});
		});
	});

	describe('parseEventForDB', () => {
		it('serializes the payload as JSON', () => {
			const parsed = Event.parseEventForDB({
				id: '123',
				type: 'start',
				time: '2026-07-30T10:00:00.000Z',
				payload: {a: 1},
			});

			expect(parsed).toStrictEqual({
				id: '123',
				type: 'start',
				time: '2026-07-30T10:00:00.000Z',
				payload: '{"a":1}',
			});
		});

		it('falls back to an empty object when the payload cannot be serialized', () => {
			const circular = {};
			circular.self = circular;

			const parsed = Event.parseEventForDB({id: '123', type: 'start', time: 't', payload: circular});

			expect(parsed.payload).toBe('{}');
		});

		it('handles a missing event', () => {
			expect(Event.parseEventForDB(undefined)).toStrictEqual({
				id: undefined,
				type: undefined,
				time: undefined,
				payload: undefined,
			});
		});
	});

	describe('parseEventFromDB', () => {
		it('parses the JSON payload back into an object', () => {
			const parsed = Event.parseEventFromDB({id: '123', type: 'start', time: 't', payload: '{"a":1}'});

			expect(parsed.payload).toStrictEqual({a: 1});
		});

		it('returns the raw payload when it is not valid JSON', () => {
			const parsed = Event.parseEventFromDB({id: '123', type: 'start', time: 't', payload: undefined});

			expect(parsed.payload).toBeUndefined();
		});
	});
});
