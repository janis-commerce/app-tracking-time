import Realm from 'realm';
import RNFS from 'react-native-fs';
import Event from './event';
import EventTrackerError from './event-tracker-error';
import EventSchema from '../db/schemas/eventSchema';

class Database {
	constructor(filename) {
		this.filename = filename;
		this.path = `${RNFS.DocumentDirectoryPath}/realm/timetracker`;
		this.filePath = `${this.path}/${this.filename}.realm`;
	}

	async save(event) {
		let db = null;
		try {
			if (!this.filename) throw new EventTrackerError('database filename was not specified');

			await this._checkFolderCreation();
			db = await Realm.open({
				path: this.filePath,
				schema: [EventSchema],
			});

			const parsedEvent = Event.parseEventForDB(event);

			db.write(() => {
				db.create('event', parsedEvent);
			});
		} catch (e) {
			const customError = new EventTrackerError(e);
			return Promise.reject(customError);
		} finally {
			if (db && !db?.isClosed) db?.close();
		}
	}

	async search(filters = '', ...values) {
		let db = null;
		try {
			if (!this.filename) throw new EventTrackerError('database filename was not specified');

			await this._checkFolderCreation();
			db = await Realm.open({
				path: this.filePath,
				schema: [EventSchema],
			});

			const collection = db.objects('event');

			let collectionCopy = collection;

			if (filters) {
				collectionCopy = collection.filtered(filters, ...values);
			}

			const parsedCollection = collectionCopy.map((obj) => {
				return JSON.parse(JSON.stringify(obj));
			});

			return parsedCollection;
		} catch (e) {
			const customError = new EventTrackerError(e);

			return Promise.reject(customError);
		} finally {
			if (db && !db?.isClosed) db?.close();
		}
	}

	async delete(filters = '', ...values) {
		let db = null;
		try {
			if (!this.filename) throw new EventTrackerError('database filename was not specified');
			if (!filters || !values) return null;

			await this._checkFolderCreation();
			db = await Realm.open({
				path: this.filePath,
				schema: [EventSchema],
			});

			const collection = db.objects('event');

			const events = collection.filtered(filters, ...values);

			db.write(() => {
				db.delete(events);
			});
		} catch (e) {
			const customError = new EventTrackerError(e);
			return Promise.reject(customError);
		} finally {
			if (db && !db?.isClosed) db?.close();
		}
	}

	async deleteAll() {
		let db = null;
		try {
			if (!this.filename) throw new EventTrackerError('database filename was not specified');

			await this._checkFolderCreation();
			db = await Realm.open({
				path: this.filePath,
				schema: [EventSchema],
			});

			db.write(() => {
				db.deleteAll();
			});
		} catch (e) {
			const customError = new EventTrackerError(e);
			return Promise.reject(customError);
		} finally {
			if (db && !db?.isClosed) db?.close();
		}
	}

	async isFolderAvailable() {
		try {
			const folderPath = this.path;
			return await RNFS.exists(folderPath);
		} catch (error) {
			return false;
		}
	}

	async removeDatabaseFolder() {
		try {
			const folderExist = await this.isFolderAvailable();

			if (!folderExist) return null;
			const folderPath = this.path;

			await RNFS.unlink(folderPath);

			return true;
		} catch (error) {
			const customError = new EventTrackerError(error);

			return Promise.reject(customError);
		}
	}

	async createDatabaseFolder() {
		try {
			const folderPath = this.path;
			return await RNFS.mkdir(folderPath);
		} catch (error) {
			const customError = new EventTrackerError(error);

			return Promise.reject(customError);
		}
	}

	async _checkFolderCreation() {
		const folderExist = await this.isFolderAvailable();
		if (folderExist) {
			return null;
		}

		return await this.createDatabaseFolder();
	}
}

export default Database;
