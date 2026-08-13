import Helpers from '../utils/helpers';

describe('Helpers', () => {
	describe('isString / isObject / isArray', () => {
		it('validates strings, objects and arrays', () => {
			expect(Helpers.isString('abc')).toBe(true);
			expect(Helpers.isString('')).toBe(false);
			expect(Helpers.isObject({a: 1})).toBe(true);
			expect(Helpers.isObject([])).toBe(false);
			expect(Helpers.isArray([])).toBe(true);
			expect(Helpers.isArray({})).toBe(false);
		});
	});

	describe('sortValidEventsByTime', () => {
		const start = {type: 'start', time: '2026-07-30T10:00:00.000Z'};
		const finish = {type: 'finish', time: '2026-07-30T10:05:00.000Z'};
		const corrupted = {type: 'pause', time: 'garbage'};

		it.each([undefined, null, 'events', {}])('returns an empty array for %p', (events) => {
			expect(Helpers.sortValidEventsByTime(events)).toStrictEqual([]);
		});

		it('orders the events chronologically', () => {
			expect(Helpers.sortValidEventsByTime([finish, start])).toStrictEqual([start, finish]);
		});

		it('discards the events with an invalid time', () => {
			expect(Helpers.sortValidEventsByTime([start, corrupted, finish])).toStrictEqual([
				start,
				finish,
			]);
		});

		it('keeps the same result whatever the storage order of a corrupted event is', () => {
			const storageOrders = [
				[start, finish, corrupted],
				[corrupted, start, finish],
				[finish, corrupted, start],
			];

			const lastTypes = storageOrders.map((events) => {
				const sorted = Helpers.sortValidEventsByTime(events);

				return sorted[sorted.length - 1].type;
			});

			expect(lastTypes).toStrictEqual(['finish', 'finish', 'finish']);
		});

		it('does not mutate the received array', () => {
			const events = [finish, start];

			Helpers.sortValidEventsByTime(events);

			expect(events).toStrictEqual([finish, start]);
		});
	});

	describe('getTimeDifference', () => {
		it('returns milliseconds when format is falsy', () => {
			expect(
				Helpers.getTimeDifference('2026-07-30T10:00:00.000Z', '2026-07-30T10:00:05.000Z', false),
			).toBe(5000);
		});

		it('returns the formatted object with days zeroed for a same-day span', () => {
			expect(
				Helpers.getTimeDifference('2026-07-30T10:00:00.000Z', '2026-07-30T11:30:20.000Z', true),
			).toStrictEqual({days: 0, hours: 1, minutes: 30, seconds: 20});
		});

		it('keeps the days for a span across different days', () => {
			expect(
				Helpers.getTimeDifference('2026-07-29T10:00:00.000Z', '2026-07-31T12:00:00.000Z', true),
			).toStrictEqual({days: 2, hours: 2, minutes: 0, seconds: 0});
		});
	});

	describe('convertMillisecondsToTime', () => {
		it('returns the zero object when milliseconds is falsy', () => {
			expect(Helpers.convertMillisecondsToTime(0)).toStrictEqual({
				days: 0,
				hours: 0,
				minutes: 0,
				seconds: 0,
			});
		});

		it('splits milliseconds into days, hours, minutes and seconds', () => {
			const twoDaysThreeHours = 2 * 24 * 3600 * 1000 + 3 * 3600 * 1000 + 4 * 60 * 1000 + 5 * 1000;

			expect(Helpers.convertMillisecondsToTime(twoDaysThreeHours)).toStrictEqual({
				days: 2,
				hours: 3,
				minutes: 4,
				seconds: 5,
			});
		});
	});

	describe('getFilters', () => {
		it('builds the filter for id only', () => {
			expect(Helpers.getFilters({id: '123'})).toBe('id LIKE[c] $0');
		});

		it('builds the combined filter for id and type', () => {
			expect(Helpers.getFilters({id: '123', type: 'start'})).toBe('id LIKE[c] $0 && type = $1');
		});

		it('returns an empty string without valid values', () => {
			expect(Helpers.getFilters({})).toBe('');
		});
	});

	describe('_mappedFilters', () => {
		it('returns an empty array when filters is not a valid array', () => {
			expect(Helpers._mappedFilters(undefined)).toStrictEqual([]);
			expect(Helpers._mappedFilters('id')).toStrictEqual([]);
		});
	});

	describe('promiseWrapper', () => {
		it('resolves to [data, null] on success', async () => {
			await expect(Helpers.promiseWrapper(Promise.resolve('ok'))).resolves.toStrictEqual([
				'ok',
				null,
			]);
		});

		it('resolves to [null, error] on failure', async () => {
			const error = new Error('boom');
			await expect(Helpers.promiseWrapper(Promise.reject(error))).resolves.toStrictEqual([
				null,
				error,
			]);
		});
	});
});
