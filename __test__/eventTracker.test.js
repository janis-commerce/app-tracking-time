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
	const saveFn = Database.prototype.save;
	const searchFn = Database.prototype.search;
	const deleteFn = Database.prototype.delete;
	const deleteAllFn = Database.prototype.deleteAll;
	const removeDatabaseFolderFn = Database.prototype.removeDatabaseFolder;

	const diffTimeMock = jest.spyOn(Helpers, 'getTimeDifference');
	const mockDate = new Date('2023-01-01T00:15:00.000Z');
	jest.spyOn(console, 'warn').mockImplementation(() => {});

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
				searchFn.mockResolvedValueOnce([]);
				const response = await eventTracker.addEvent({id: '345', type: 'start'});
				expect(response).toBeTruthy();
			});
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

	describe('getStoppedTime method', () => {
		describe('return 0', () => {
			it('should return 0  if not pass events or this is an empty array', () => {
				const response = eventTracker.getStoppedTime({});

				expect(response).toStrictEqual(0);
			});
		});

		describe('should return stopped time', () => {
			it('should return stopped time in time format if format params is true', () => {
				const registeredEvents = [
					{id: '345', type: 'pause', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'pause', time: '2023-01-01T00:00:10.000Z'},
					{id: '345', type: 'resume', time: '2023-01-01T00:00:20.000Z'},
					{id: '345', type: 'pause', time: '2023-01-01T00:00:40.000Z'},
					{id: '345', type: 'pause', time: '2023-01-01T00:01:00.000Z'},
					{id: '345', type: 'resume', time: '2023-01-01T00:01:20.000Z'},
				];

				const response = eventTracker.getStoppedTime({events: registeredEvents, format: true});

				expect(response).toStrictEqual({days: 0, hours: 0, minutes: 0, seconds: 30});
			});
		});
	});

	describe('getNetTrackingTime method', () => {
		describe('return 0', () => {
			it('should return 0 when not receive a valid array as argument ', () => {
				const response = eventTracker.getNetTrackingTime({});

				expect(response).toStrictEqual(0);
			});

			it('should return 0 when elapsed time is 0 or less than 0', () => {
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

	describe('isEventStarted method', () => {
		describe('throws an error when', () => {
			it('id is invalid or null', () => {
				expect(eventTracker.isEventStarted()).rejects.toThrow('ID is invalid or null');
			});
		});

		describe('returns a boolean indicating whether the id was started or not', () => {
			it('if id is started, return true', async () => {
				searchFn.mockResolvedValueOnce([{id: '123', type: 'start'}]);

				const response = await eventTracker.isEventStarted('123');

				expect(response).toBeTruthy();
			});

			it('return false when the id wasnt initialized', async () => {
				searchFn.mockResolvedValueOnce([]);
				const response = await eventTracker.isEventStarted('345');

				expect(response).toBeFalsy();
			});
		});
	});

	describe('removeFinishById method', () => {
		it('remove finish event when delete database method resolved correctly', async () => {
			deleteFn.mockResolvedValueOnce();

			await eventTracker.removeFinishById('123');

			expect(deleteFn).toHaveBeenCalled();
		});

		it('return a reject promise when delete method fails', async () => {
			deleteFn.mockRejectedValueOnce(new Error('delete error'));

			await expect(eventTracker.removeFinishById('123')).rejects.toThrow('delete error');
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
					{id: '123', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
					{id: '456', type: 'pause', time: '2023-01-01T00:00:10.000Z', payload: '{}'},
				];
				searchFn.mockResolvedValueOnce(mockEvents);

				const response = await eventTracker.searchEventByQuery();

				expect(searchFn).toHaveBeenCalledWith('', ...[]);
				expect(response).toStrictEqual(mockEvents);
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
				expect(response).toStrictEqual(mockEvents);
			});

			it('searching by type', async () => {
				const mockEvents = [
					{id: '123', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'},
					{id: '456', type: 'start', time: '2023-01-01T00:00:05.000Z', payload: '{}'},
				];
				searchFn.mockResolvedValueOnce(mockEvents);

				const response = await eventTracker.searchEventByQuery('type == $0', 'start');

				expect(searchFn).toHaveBeenCalledWith('type == $0', 'start');
				expect(response).toStrictEqual(mockEvents);
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
				expect(response).toStrictEqual(mockEvents);
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
