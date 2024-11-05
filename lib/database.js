import Realm from 'realm';
import RNFS from 'react-native-fs';
import Event from './event'
import EventTrackerError from './event-tracker-error';
import EventSchema from '../db/schemas/eventSchema';

class Database {
    constructor(filename) {
        this.filename = filename;
        this.path = `${RNFS.DocumentDirectoryPath}/realm/timetracker`;
        this.filePath = `${this.path}/${this.filename}.realm`;

        this._checkFolderCreation()
    }

    async save(event) {
        try {
            if(!this.filename) throw new EventTrackerError('database filename was not specified')
            const db = await Realm.open({
                path: this.filePath,
                schema:[EventSchema]
            })

            const parsedEvent = Event.parseEventForDB(event);

            db.write(() => {
                db.create('event',parsedEvent)
            })
            
        } catch (e) {
            const customError = new EventTrackerError(e);

            return Promise.reject(customError);
        }
       
    }

    async search(filters = '', ...values) {
        try {
            if(!this.filename) throw new EventTrackerError('database filename was not specified')
            const db = await Realm.open({
                path: this.filePath,
                schema:[EventSchema]
            })

            const collection = db.objects('event');

            if(!filters || !values) return collection;

            return collection.filtered(filters,...values)

        } catch (e) {
            const customError = new EventTrackerError(e);

            return Promise.reject(customError);
        }
    }

    async delete(filters = '', ...values) {
        try {
            if(!this.filename) throw new EventTrackerError('database filename was not specified')  
            if(!filters || !values) return null;

            const db = await Realm.open({
                path: this.filePath,
                schema:[EventSchema]
            })

            const collection = db.objects('event');

            const events = collection.filtered(filters,...values)

            db.write(() => {
                db.delete(events);
            })
        } catch (e) {
            const customError = new EventTrackerError(e);

            return Promise.reject(customError);
        }
    }

    async deleteAll() {
        try {
            if(!this.filename) throw new EventTrackerError('database filename was not specified')  
            const db = await Realm.open({
                path: this.filePath,
                schema:[EventSchema]
            })

            db.write(() => {
                db.deleteAll()
            })
        } catch (e) {
            const customError = new EventTrackerError(e);

            return Promise.reject(customError);
        }
    }

    async isFolderExist() {
        try {
            // const folderPath = `${RNFS.DocumentDirectoryPath}/realm/timetracker`
            const folderPath = this.path;
            return await RNFS.exists(folderPath)
        } catch(error) {
            return false;
        }
    }

    async removeDatabaseFolder() {
        try {
            const folderExist = await this.isFolderExist();

            if(!folderExist) return null;
            const folderPath = this.path;

            return await RNFS.unlink(folderPath);
        } catch (error) {
            const customError = new EventTrackerError(error);

            return Promise.reject(customError);
        }
    }

    async createDatabaseFolder() {
        try {
            const folderPath = this.path;
            return await RNFS.mkdir(folderPath)
        } catch (error) {
            const customError = new EventTrackerError(error);

            return Promise.reject(customError);
        }
    }
    
    async _checkFolderCreation() {
        const folderExist = await this.isFolderExist();
        if(folderExist) {
            return null;
        }

        return await this.createDatabaseFolder()
    }
}

export default Database;