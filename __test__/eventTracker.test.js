import EventTracker from '../lib/event-tracker';
import Database from '../lib/database';
import Helpers from '../utils/helpers';

jest.mock('../lib/database');

describe('EventTracker class', () => {
	const DEFAULT_ELAPSED_TIME = {
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
	};

	const eventTracker = new EventTracker('timetracker');
	const writeEventsFn = Database.prototype.writeEvents;
	const searchFn = Database.prototype.search;
	const deleteFn = Database.prototype.delete;
	const deleteAllFn = Database.prototype.deleteAll;
	const removeDatabaseFolderFn = Database.prototype.removeDatabaseFolder;

	const diffTimeMock = jest.spyOn(Helpers, 'getTimeDifference');
	const mockDate = new Date('2023-01-01T00:15:00.000Z');
	jest.spyOn(console, 'warn').mockImplementation(() => {});

	// Runs what the tracker builds against the given stored events, as the write transaction does
	const givenStoredEvents = (storedEvents) =>
		writeEventsFn.mockImplementationOnce(async (filters, values, getEventsToSave) =>
			getEventsToSave(storedEvents),
		);

	// Each write reads what the previous ones saved, as the database does
	const keepWrittenEvents = (storedEvents) => {
		beforeEach(() => {
			storedEvents.length = 0;
			writeEventsFn.mockImplementation(async (filters, values, getEventsToSave) => {
				const savedEvents = getEventsToSave([...storedEvents]);
				storedEvents.push(...savedEvents);
				return savedEvents;
			});
		});

		afterEach(() => {
			writeEventsFn.mockReset();
		});
	};

	describe('return methods to handler time events', () => {
		it('when the class is instantiated', () => {
			expect(typeof eventTracker.addEvent).toBe('function');
		});
	});
	describe('addEvent method', () => {
		describe('throws an error when', () => {
			it('passed id is invalid', async () => {
				expect(eventTracker.addEvent({id: null})).rejects.toThrow('ID is invalid or null');
			});

			it('passed type is invalid', async () => {
				expect(eventTracker.addEvent({id: '123', type: 'fakeStart'})).rejects.toThrow(
					'Event type is invalid',
				);
			});
		});

		describe('add an event when', () => {
			it('id and type are valids', async () => {
				givenStoredEvents([]);
				const response = await eventTracker.addEvent({id: '345', type: 'start'});
				expect(response).toBeTruthy();
			});
		});

		describe('normalizes the received type so that', () => {
			it('the persisted event keeps the canonical lowercase type', async () => {
				givenStoredEvents([]);

				await eventTracker.addEvent({id: '345', type: 'START', time: '2023-01-01T00:00:00.000Z'});

				await expect(writeEventsFn.mock.results[0].value).resolves.toStrictEqual([
					expect.objectContaining({id: '345', type: 'start'}),
				]);
			});

			it('an uppercase type does not bypass the sequence validation', async () => {
				givenStoredEvents([
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
				]);

				await expect(eventTracker.addEvent({id: '345', type: 'START'})).rejects.toThrow(
					'only one start record is allowed per cycle',
				);
			});

			it('a missing type rejects with an EventTrackerError instead of a TypeError', async () => {
				await expect(eventTracker.addEvent({id: '345'})).rejects.toThrow('Event type is invalid');
			});

			it('a call without params rejects with the id error', async () => {
				await expect(eventTracker.addEvent()).rejects.toThrow('ID is invalid or null');
			});
		});
	});

	describe('multi-cycle events sequence', () => {
		describe('allows', () => {
			it('a new start after a finish (reopens the record with a new cycle)', async () => {
				givenStoredEvents([
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
					{id: '345', type: 'finish', time: '2023-01-01T00:05:00.000Z', payload: '{}'},
				]);

				const response = await eventTracker.addEvent({id: '345', type: 'start'});

				expect(response).toBeTruthy();
			});

			it('a new start when the history carries an event with a corrupted time', async () => {
				givenStoredEvents([
					{id: '345', type: 'finish', time: '2023-01-01T00:05:00.000Z', payload: '{}'},
					{id: '345', type: 'pause', time: 'garbage', payload: '{}'},
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
				]);

				const response = await eventTracker.addEvent({id: '345', type: 'start'});

				expect(response).toBeTruthy();
			});

			it('a pause within a reopened cycle', async () => {
				givenStoredEvents([
					{id: '345', type: 'finish', time: '2023-01-01T00:05:00.000Z', payload: '{}'},
					{id: '345', type: 'start', time: '2023-01-01T00:10:00.000Z', payload: '{}'},
				]);

				const response = await eventTracker.addEvent({id: '345', type: 'pause'});

				expect(response).toBeTruthy();
			});
		});

		describe('rejects', () => {
			it('a second start while a cycle is open', async () => {
				givenStoredEvents([
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
				]);

				await expect(eventTracker.addEvent({id: '345', type: 'start'})).rejects.toThrow(
					'only one start record is allowed per cycle',
				);
			});

			it('a start while the cycle is paused', async () => {
				givenStoredEvents([
					{id: '345', type: 'pause', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
				]);

				await expect(eventTracker.addEvent({id: '345', type: 'start'})).rejects.toThrow(
					'there is a cycle in progress',
				);
			});

			it('a finish over an already finished record', async () => {
				givenStoredEvents([
					{id: '345', type: 'finish', time: '2023-01-01T00:05:00.000Z', payload: '{}'},
				]);

				await expect(eventTracker.addEvent({id: '345', type: 'finish'})).rejects.toThrow(
					'record is already finished',
				);
			});

			it('a resume after a finish', async () => {
				givenStoredEvents([
					{id: '345', type: 'finish', time: '2023-01-01T00:05:00.000Z', payload: '{}'},
				]);

				await expect(eventTracker.addEvent({id: '345', type: 'resume'})).rejects.toThrow(
					"record wasn't paused",
				);
			});

			it('a pause after a finish', async () => {
				givenStoredEvents([
					{id: '345', type: 'finish', time: '2023-01-01T00:05:00.000Z', payload: '{}'},
				]);

				await expect(eventTracker.addEvent({id: '345', type: 'pause'})).rejects.toThrow(
					"record can't be paused",
				);
			});
		});

		describe('when the device clock goes back', () => {
			const storedEvents = [];

			keepWrittenEvents(storedEvents);

			it('stores a late event right after the last one, so the next cycle can still be finished', async () => {
				await eventTracker.addEvent({id: '345', type: 'start', time: '2023-01-01T10:00:00.000Z'});
				await eventTracker.addEvent({id: '345', type: 'finish', time: '2023-01-01T10:05:00.000Z'});

				const reopened = await eventTracker.addEvent({
					id: '345',
					type: 'start',
					time: '2023-01-01T09:56:00.000Z',
				});
				const finished = await eventTracker.addEvent({
					id: '345',
					type: 'finish',
					time: '2023-01-01T09:57:00.000Z',
				});

				expect(reopened.time).toBe('2023-01-01T10:05:00.001Z');
				expect(finished.time).toBe('2023-01-01T10:05:00.002Z');
				expect(eventTracker.getNetTrackingTime({events: storedEvents})).toBe(300001);
			});

			it('keeps a time equal to the last event as received', async () => {
				await eventTracker.addEvent({id: '345', type: 'start', time: '2023-01-01T10:00:00.000Z'});

				const finished = await eventTracker.addEvent({
					id: '345',
					type: 'finish',
					time: '2023-01-01T10:00:00.000Z',
				});

				expect(finished.time).toBe('2023-01-01T10:00:00.000Z');
			});
		});

		describe('when two writes on a record arrive at the same time', () => {
			const storedEvents = [];

			keepWrittenEvents(storedEvents);

			beforeEach(() => {
				storedEvents.push({
					id: '345',
					type: 'start',
					time: '2023-01-01T10:00:00.000Z',
					payload: '{}',
				});
			});

			it('saves a single finish and rejects the other one', async () => {
				const results = await Promise.allSettled([
					eventTracker.addEvent({id: '345', type: 'finish', time: '2023-01-01T10:05:00.000Z'}),
					eventTracker.addEvent({id: '345', type: 'finish', time: '2023-01-01T10:05:00.010Z'}),
				]);

				expect(results.map(({status}) => status)).toStrictEqual(['fulfilled', 'rejected']);
				expect(results[1].reason.message).toMatch('record is already finished');
				expect(storedEvents.map(({type}) => type)).toStrictEqual(['start', 'finish']);
			});
		});
	});

	describe('addEvents method', () => {
		describe('throws an error when', () => {
			it('passed id is invalid', async () => {
				await expect(eventTracker.addEvents(null, [])).rejects.toThrow('ID is invalid or null');
			});

			it('the events are not an array', async () => {
				await expect(eventTracker.addEvents('345', 'start')).rejects.toThrow(
					'Events must be an array',
				);
			});

			it('the record already has events, even the same history, so nothing is saved', async () => {
				givenStoredEvents([
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
					{id: '345', type: 'finish', time: '2023-01-01T00:05:00.000Z', payload: '{}'},
				]);

				await expect(
					eventTracker.addEvents('345', [
						{type: 'start', time: '2023-01-01T00:00:00.000Z'},
						{type: 'finish', time: '2023-01-01T00:05:00.000Z'},
					]),
				).rejects.toThrow('Forbidden history: record already has events');
			});
		});

		describe('saves the history in a single write', () => {
			it('in chronological order, keeping the first of the stacked finishes', async () => {
				givenStoredEvents([]);

				const response = await eventTracker.addEvents('345', [
					{type: 'finish', time: '2023-01-01T00:30:00.000Z'},
					{type: 'start', time: '2023-01-01T00:00:00.000Z'},
					{type: 'finish', time: '2023-01-01T00:10:00.000Z'},
				]);

				expect(writeEventsFn).toHaveBeenCalledTimes(1);
				expect(response).toStrictEqual([
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:10:00.000Z'},
				]);
			});

			it('with the normalized type, a canonical time and the payload of each event', async () => {
				givenStoredEvents([]);

				await eventTracker.addEvents('345', [
					{type: 'START', time: '2023-01-01T00:00:00Z', payload: {userId: '123'}},
				]);

				await expect(writeEventsFn.mock.results[0].value).resolves.toStrictEqual([
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: {userId: '123'}},
				]);
			});
		});

		describe('when two restores of a record arrive at the same time', () => {
			const storedEvents = [];

			keepWrittenEvents(storedEvents);

			it('saves the history once and rejects the other restore', async () => {
				const history = [
					{type: 'start', time: '2023-01-01T00:00:00.000Z'},
					{type: 'finish', time: '2023-01-01T00:05:00.000Z'},
				];

				const results = await Promise.allSettled([
					eventTracker.addEvents('345', history),
					eventTracker.addEvents('345', history),
				]);

				expect(results.map(({status}) => status)).toStrictEqual(['fulfilled', 'rejected']);
				expect(storedEvents.map(({type}) => type)).toStrictEqual(['start', 'finish']);
			});
		});

		it('does not write when no event of the history is valid', async () => {
			const response = await eventTracker.addEvents('345', [
				{type: 'finish', time: 'garbage'},
				{type: 'pause', time: '2023-01-01T00:00:00.000Z'},
				null,
			]);

			expect(response).toStrictEqual([]);
			expect(writeEventsFn).not.toHaveBeenCalled();
		});
	});

	describe('getEventsById method', () => {
		describe('throws an error when', () => {
			it('id isnt valid', () => {
				expect(eventTracker.getEventsById(12345)).rejects.toThrow('ID is invalid or null');
			});
		});

		describe('return an array with', () => {
			it('related events when id is valid', async () => {
				searchFn.mockResolvedValueOnce([
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
					{id: '345', type: 'pause', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
				]);

				const response = await eventTracker.getEventsById('345');

				expect(response).toStrictEqual([
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: {}},
					{id: '345', type: 'pause', time: '2023-01-01T00:00:00.000Z', payload: {}},
				]);
			});

			it('returns events in chronological order even when storage order is shuffled', async () => {
				searchFn.mockResolvedValueOnce([
					{id: '345', type: 'finish', time: '2023-01-01T00:10:00.000Z', payload: '{}'},
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
				]);

				const response = await eventTracker.getEventsById('345');

				expect(response.map((event) => event.type)).toStrictEqual(['start', 'finish']);
			});
		});

		describe('return a valid sequence, dropping', () => {
			it('the stacked finishes a 2.x database keeps, except the first one', async () => {
				searchFn.mockResolvedValueOnce([
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
					{id: '345', type: 'finish', time: '2023-01-01T00:10:00.000Z', payload: '{}'},
					{id: '345', type: 'finish', time: '2023-01-01T00:30:00.000Z', payload: '{}'},
				]);

				const response = await eventTracker.getEventsById('345');

				expect(response).toStrictEqual([
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: {}},
					{id: '345', type: 'finish', time: '2023-01-01T00:10:00.000Z', payload: {}},
				]);
			});

			it('nothing from a valid multi-cycle history', async () => {
				const storedEvents = [
					{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
					{id: '345', type: 'pause', time: '2023-01-01T00:01:00.000Z', payload: '{}'},
					{id: '345', type: 'resume', time: '2023-01-01T00:02:00.000Z', payload: '{}'},
					{id: '345', type: 'finish', time: '2023-01-01T00:03:00.000Z', payload: '{}'},
					{id: '345', type: 'start', time: '2023-01-01T00:10:00.000Z', payload: '{}'},
					{id: '345', type: 'finish', time: '2023-01-01T00:20:00.000Z', payload: '{}'},
				];
				searchFn.mockResolvedValueOnce(storedEvents);

				const response = await eventTracker.getEventsById('345');

				expect(response.map(({type, time}) => ({type, time}))).toStrictEqual(
					storedEvents.map(({type, time}) => ({type, time})),
				);
			});
		});
	});

	describe('getLastEventById mehtod', () => {
		describe('throws an error', () => {
			it('when received id is invalid', () => {
				expect(eventTracker.getLastEventById(null)).rejects.toThrow('ID is invalid or null');
			});
		});

		it('return last event type registered', async () => {
			searchFn.mockResolvedValueOnce([
				{id: '345', type: 'start'},
				{id: '345', type: 'pause'},
				{
					id: '345',
					type: 'resume',
					payload: '{"userId":"123","warehouseId":"123-wh"}',
					time: '2023-01-01T00:00:00.000Z',
				},
			]);

			const typeResponse = await eventTracker.getLastEventById('345');

			expect(typeResponse).toStrictEqual({
				id: '345',
				type: 'resume',
				time: '2023-01-01T00:00:00.000Z',
				payload: {userId: '123', warehouseId: '123-wh'},
			});
		});

		it('returns an empty object when the record has no events', async () => {
			searchFn.mockResolvedValueOnce([]);

			const lastEvent = await eventTracker.getLastEventById('345');

			expect(lastEvent).toStrictEqual({});
		});

		it('returns the chronologically last event even when storage order is shuffled', async () => {
			searchFn.mockResolvedValueOnce([
				{id: '345', type: 'finish', time: '2023-01-01T00:10:00.000Z'},
				{id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z'},
			]);

			const typeResponse = await eventTracker.getLastEventById('345');

			expect(typeResponse.type).toStrictEqual('finish');
		});
	});

	describe('getElapsedTime method', () => {
		describe('return default elapsedTime', () => {
			it('should return default elapsedTime when startTime is null', () => {
				expect(eventTracker.getElapsedTime({})).toStrictEqual(DEFAULT_ELAPSED_TIME);
			});

			it('should return 0 when startTime is null and format is false', () => {
				expect(eventTracker.getElapsedTime({format: false})).toStrictEqual(0);
			});
		});

		describe('return elasped time', () => {
			it('between started time and finish time', () => {
				const startTime = '2023-01-01T00:00:00.000Z';
				const finishTime = '2023-01-01T00:30:00.000Z';

				diffTimeMock.mockReturnValueOnce({
					days: 0,
					hours: 0,
					minutes: 30,
					seconds: 0,
				});

				const response = eventTracker.getElapsedTime({startTime, finishTime});
				expect(response).toStrictEqual({
					days: 0,
					hours: 0,
					minutes: 30,
					seconds: 0,
				});
			});
		});

		it('but, if the id hasnt finish time, la comparación se realizará contra la hora actual', async () => {
			jest.spyOn(mockDate, 'toISOString').mockReturnValueOnce('2023-01-01T00:15:00.000Z');

			diffTimeMock.mockReturnValueOnce(60116031652);

			const startTime = '2023-01-01T00:00:00.000Z';

			const response = eventTracker.getElapsedTime({startTime, format: false});

			expect(response).toStrictEqual(60116031652);
		});
	});

	describe('getNetTrackingTime method', () => {
		describe('return 0', () => {
			it('should return 0 when not receive a valid array as argument ', () => {
				const response = eventTracker.getNetTrackingTime({});

				expect(response).toStrictEqual(0);
			});

			it('should return the formatted zero object when not receive a valid array and format is true', () => {
				const response = eventTracker.getNetTrackingTime({format: true});

				expect(response).toStrictEqual(DEFAULT_ELAPSED_TIME);
			});

			it('should return 0 when start and finish share the same time', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:00:10.000Z'},
				];

				const response = eventTracker.getNetTrackingTime({events});

				expect(response).toStrictEqual(0);
			});
		});

		describe('should return net tracked time', () => {
			it('should return net tracking time when get elapsed time and discount paused time', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'pause', time: '2023-01-01T00:00:15.000Z'},
					{id: '345', type: 'resume', time: '2023-01-01T00:00:40.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:00:50.000Z'},
				];

				const response = eventTracker.getNetTrackingTime({events});

				expect(response).toStrictEqual(15000);
			});
			it('should return formatted net tracking time when get elapsed time and discount paused time, but format argument is true', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'pause', time: '2023-01-01T00:00:15.000Z'},
					{id: '345', type: 'resume', time: '2023-01-01T00:00:40.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:00:50.000Z'},
				];

				const response = eventTracker.getNetTrackingTime({events, format: true});

				expect(response).toStrictEqual({days: 0, hours: 0, minutes: 0, seconds: 15});
			});
		});

		describe('should support multiple cycles', () => {
			it('should sum the active spans of every start-finish cycle', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:00:20.000Z'},
					{id: '345', type: 'start', time: '2023-01-01T00:10:00.000Z'},
					{id: '345', type: 'pause', time: '2023-01-01T00:10:05.000Z'},
					{id: '345', type: 'resume', time: '2023-01-01T00:20:00.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:20:15.000Z'},
				];

				const response = eventTracker.getNetTrackingTime({events});

				expect(response).toStrictEqual(30000);
			});

			it('should not count a trailing open span when the record is in progress', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:00:20.000Z'},
					{id: '345', type: 'start', time: '2023-01-01T00:10:00.000Z'},
				];

				const response = eventTracker.getNetTrackingTime({events});

				expect(response).toStrictEqual(10000);
			});
		});

		describe('should tolerate dirty histories', () => {
			it('should ignore stacked finish events from legacy data', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:00:20.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:30:00.000Z'},
				];

				const response = eventTracker.getNetTrackingTime({events});

				expect(response).toStrictEqual(10000);
			});

			it('should close the span on a finish emitted directly after a pause', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'pause', time: '2023-01-01T00:00:20.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:05:00.000Z'},
				];

				const response = eventTracker.getNetTrackingTime({events});

				expect(response).toStrictEqual(10000);
			});

			it('should sort events by time when storage order is not chronological', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T00:10:00.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:10:05.000Z'},
					{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:00:20.000Z'},
				];

				const response = eventTracker.getNetTrackingTime({events});

				expect(response).toStrictEqual(15000);
			});

			it('should drop an opener while a span is already open, so overlapping cycles under-count', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T10:00:00.000Z'},
					{id: '345', type: 'start', time: '2023-01-01T10:02:00.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T10:05:00.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T10:08:00.000Z'},
				];

				const response = eventTracker.getNetTrackingTime({events});

				expect(response).toStrictEqual(300000);
			});

			it('should ignore events with an invalid time without wiping valid cycles', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:00:20.000Z'},
					{id: '345', type: 'finish', time: undefined},
				];

				const response = eventTracker.getNetTrackingTime({events});

				expect(response).toStrictEqual(10000);
			});

			it('should return the formatted zero object for an in-progress record with format true', () => {
				const events = [{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'}];

				const response = eventTracker.getNetTrackingTime({events, format: true});

				expect(response).toStrictEqual({days: 0, hours: 0, minutes: 0, seconds: 0});
			});

			it('should neutralize a device clock regression via sorting', () => {
				const events = [
					{id: '345', type: 'start', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:00:20.000Z'},
					{id: '345', type: 'start', time: '2023-01-01T00:10:00.000Z'},
					{id: '345', type: 'finish', time: '2023-01-01T00:09:00.000Z'},
				];

				const response = eventTracker.getNetTrackingTime({events});

				expect(response).toStrictEqual(10000);
			});
		});
	});

	describe('deleteEventsById method', () => {
		describe('throws an error when', () => {
			it('id is invalid or null', () => {
				expect(eventTracker.deleteEventsById()).rejects.toThrow('ID is invalid or null');
			});
		});

		describe('delete events related to id', () => {
			it('when the request complete successfully', async () => {
				deleteFn.mockResolvedValueOnce();

				await eventTracker.deleteEventsById('123');

				expect(deleteFn).toHaveBeenCalled();
			});
		});
	});

	describe('deleteAllEvents method', () => {
		describe('throws an error when  ', () => {
			it('delete fails', async () => {
				deleteAllFn.mockRejectedValueOnce('error');

				const [, error] = await Helpers.promiseWrapper(eventTracker.deleteAllEvents());

				expect(error).toStrictEqual('error');
			});
		});

		describe('wipe database when', () => {
			it('database request complete successfully', async () => {
				deleteAllFn.mockResolvedValueOnce();

				await eventTracker.deleteAllEvents();

				expect(deleteAllFn).toHaveBeenCalled();
			});
		});
	});

	describe('getIdTimeByType method', () => {
		describe('throws an error when', () => {
			it('passed id is invalid', async () => {
				expect(eventTracker.getIdTimeByType()).rejects.toThrow('ID is invalid or null');
			});

			it('passed type is invalid', async () => {
				expect(eventTracker.getIdTimeByType('123', 'fakeStart')).rejects.toThrow(
					'Event type is invalid',
				);
			});
		});

		describe('return null', () => {
			it('should return null when there are no events for the id and type', async () => {
				searchFn.mockResolvedValueOnce([]);

				const time = await eventTracker.getIdTimeByType('123', 'finish');

				expect(time).toBeNull();
			});

			it('should return null when finded event not contains time key', async () => {
				searchFn.mockResolvedValueOnce([{id: '123', type: 'start', payload: {}}]);

				const time = await eventTracker.getIdTimeByType('123', 'start');

				expect(time).toBeNull();
			});
		});

		describe('return time value', () => {
			it('should return time register value when has valid type, valid id and valid time', async () => {
				searchFn.mockResolvedValueOnce([
					{id: '123', type: 'start', payload: {}, time: '2023-01-02T00:00:00.000Z'},
				]);

				const time = await eventTracker.getIdTimeByType('123', 'start');

				expect(time).toStrictEqual('2023-01-02T00:00:00.000Z');
			});

			it('should query storage with the normalized type when it arrives uppercased', async () => {
				searchFn.mockResolvedValueOnce([
					{id: '123', type: 'start', payload: {}, time: '2023-01-02T00:00:00.000Z'},
				]);

				const time = await eventTracker.getIdTimeByType('123', 'START');

				expect(searchFn).toHaveBeenCalledWith('id LIKE[c] $0 && type = $1', '123', 'start');
				expect(time).toStrictEqual('2023-01-02T00:00:00.000Z');
			});

			it('should return the chronologically last time when storage order is not chronological', async () => {
				searchFn.mockResolvedValueOnce([
					{id: '123', type: 'start', payload: {}, time: '2023-01-03T00:00:00.000Z'},
					{id: '123', type: 'start', payload: {}, time: '2023-01-01T00:00:00.000Z'},
					{id: '123', type: 'start', payload: {}, time: '2023-01-02T00:00:00.000Z'},
				]);

				const time = await eventTracker.getIdTimeByType('123', 'start');

				expect(time).toStrictEqual('2023-01-03T00:00:00.000Z');
			});
		});
	});

	describe('removeEventsFolder method', () => {
		describe('delete database', () => {
			it('should delete database if removeDatabase complete successfully', async () => {
				removeDatabaseFolderFn.mockResolvedValueOnce();

				await eventTracker.removeEventsFolder();

				expect(removeDatabaseFolderFn).toHaveBeenCalled();
			});

			it('should return a reject promise when remove method fails', async () => {
				removeDatabaseFolderFn.mockRejectedValueOnce(new Error('delete error'));

				await expect(eventTracker.removeEventsFolder()).rejects.toThrow('delete error');
			});
		});
	});

	describe('searchEventByQuery method', () => {
		describe('return all events when', () => {
			it('no query is provided', async () => {
				const mockEvents = [
					{
						id: '123',
						type: 'start',
						time: '2023-01-01T00:00:00.000Z',
						payload: '{"userId":"123","warehouseId":"123-wh"}',
					},
					{id: '456', type: 'pause', time: '2023-01-01T00:00:10.000Z', payload: '{}'},
				];
				searchFn.mockResolvedValueOnce(mockEvents);

				const response = await eventTracker.searchEventByQuery();

				expect(searchFn).toHaveBeenCalledWith('', ...[]);
				expect(response).toStrictEqual([
					{
						id: '123',
						type: 'start',
						time: '2023-01-01T00:00:00.000Z',
						payload: {userId: '123', warehouseId: '123-wh'},
					},
					{id: '456', type: 'pause', time: '2023-01-01T00:00:10.000Z', payload: {}},
				]);
			});
		});

		describe('return filtered events when', () => {
			it('searching by ID', async () => {
				const mockEvents = [
					{id: '123', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
					{id: '123', type: 'pause', time: '2023-01-01T00:00:10.000Z', payload: '{}'},
				];
				searchFn.mockResolvedValueOnce(mockEvents);

				const response = await eventTracker.searchEventByQuery('id == $0', '123');

				expect(searchFn).toHaveBeenCalledWith('id == $0', '123');
				expect(response).toStrictEqual([
					{id: '123', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: {}},
					{id: '123', type: 'pause', time: '2023-01-01T00:00:10.000Z', payload: {}},
				]);
			});

			it('searching by type', async () => {
				const mockEvents = [
					{id: '123', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
					{id: '456', type: 'start', time: '2023-01-01T00:00:05.000Z', payload: '{}'},
				];
				searchFn.mockResolvedValueOnce(mockEvents);

				const response = await eventTracker.searchEventByQuery('type == $0', 'start');

				expect(searchFn).toHaveBeenCalledWith('type == $0', 'start');
				expect(response).toStrictEqual([
					{id: '123', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: {}},
					{id: '456', type: 'start', time: '2023-01-01T00:00:05.000Z', payload: {}},
				]);
			});

			it('searching with complex query', async () => {
				const mockEvents = [
					{id: '123', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
				];
				searchFn.mockResolvedValueOnce(mockEvents);

				const response = await eventTracker.searchEventByQuery(
					'id == $0 && type == $1 && time >= $2',
					'123',
					'start',
					new Date('2023-01-01'),
				);

				expect(searchFn).toHaveBeenCalledWith(
					'id == $0 && type == $1 && time >= $2',
					'123',
					'start',
					new Date('2023-01-01'),
				);
				expect(response).toStrictEqual([
					{id: '123', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: {}},
				]);
			});

			it('searching with payload containing data', async () => {
				const mockEvents = [
					{
						id: '123',
						type: 'resume',
						time: '2023-01-01T00:00:00.000Z',
						payload: '{"userId":"123","warehouseId":"123-wh"}',
					},
				];
				searchFn.mockResolvedValueOnce(mockEvents);

				const response = await eventTracker.searchEventByQuery('id == $0', '123');

				expect(searchFn).toHaveBeenCalledWith('id == $0', '123');
				expect(response).toStrictEqual([
					{
						id: '123',
						type: 'resume',
						time: '2023-01-01T00:00:00.000Z',
						payload: {userId: '123', warehouseId: '123-wh'},
					},
				]);
			});
		});

		describe('throws an error when', () => {
			it('database search fails', async () => {
				const errorMessage = 'Database search error';
				searchFn.mockRejectedValueOnce(new Error(errorMessage));

				await expect(eventTracker.searchEventByQuery('id == $0', '123')).rejects.toThrow(
					errorMessage,
				);
			});
		});
	});
});
