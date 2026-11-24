import Realm from 'realm';
import Database from '../lib/database';
import EventTrackerError from '../lib/event-tracker-error';

describe('Database class', () => {
	describe('writeEvents method', () => {
		const storedEvent = {id: '345', type: 'start', time: '2023-01-01T00:00:00.000Z', payload: '{}'};
		const finishEvent = {id: '345', type: 'finish', time: '2023-01-01T00:05:00.000Z', payload: {}};
		const database = new Database('times');
		let realm;
		let calls;

		beforeEach(() => {
			calls = [];
			let inTransaction = false;

			realm = {
				isClosed: false,
				objects: jest.fn(() => {
					calls.push({name: 'objects', inTransaction});
					return {filtered: () => [storedEvent]};
				}),
				create: jest.fn(() => calls.push({name: 'create', inTransaction})),
				write: jest.fn((callback) => {
					inTransaction = true;
					try {
						return callback();
					} finally {
						inTransaction = false;
					}
				}),
				close: jest.fn(),
			};
			Realm.open = jest.fn().mockResolvedValue(realm);
		});

		it('reads the stored events and saves the built ones inside the same write', async () => {
			const getEventsToSave = jest.fn(() => [finishEvent]);

			const savedEvents = await database.writeEvents('id LIKE[c] $0', ['345'], getEventsToSave);

			expect(getEventsToSave).toHaveBeenCalledWith([storedEvent]);
			expect(calls).toStrictEqual([
				{name: 'objects', inTransaction: true},
				{name: 'create', inTransaction: true},
			]);
			expect(realm.create).toHaveBeenCalledWith('event', {...finishEvent, payload: '{}'});
			expect(savedEvents).toStrictEqual([finishEvent]);
			expect(realm.close).toHaveBeenCalled();
		});

		it('saves nothing and rejects with the same error when building the events fails', async () => {
			const error = new EventTrackerError('Forbidden event: record is already finished');

			await expect(
				database.writeEvents('id LIKE[c] $0', ['345'], () => {
					throw error;
				}),
			).rejects.toBe(error);

			expect(realm.create).not.toHaveBeenCalled();
			expect(realm.close).toHaveBeenCalled();
		});

		it('rejects with an EventTrackerError when the database cannot be opened', async () => {
			Realm.open.mockRejectedValueOnce(new Error('Cannot open the realm file'));

			const result = database.writeEvents('id LIKE[c] $0', ['345'], () => []);

			await expect(result).rejects.toBeInstanceOf(EventTrackerError);
			await expect(result).rejects.toThrow('Cannot open the realm file');
		});

		it('rejects without a database filename', async () => {
			await expect(new Database().writeEvents('', [], () => [])).rejects.toThrow(
				'database filename was not specified',
			);
		});
	});
});
