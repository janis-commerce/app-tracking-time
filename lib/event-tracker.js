import Event from './event';
import EventTrackerError from './event-tracker-error';
import Database from './database';
import Validations from '../utils/validations';
import Helpers from '../utils/helpers';

class EventTracker {

    constructor(filename) {
        this.db = new Database(filename);
    }
    /**
     * @name addEvent
     * @description 
     * @param {string} id 
     * @param {string} type 
     * @param {string} time
     * @param {object} payload 
     * @returns 
     */

    async addEvent({id,type,time,payload}) {
        try {
            await Validations.idValidation(id);
            
            await this._eventValidation(id, type)

            const createdEvent = Event.create(id, type, time, payload);

            await this.db.save(createdEvent);

            return createdEvent.time;
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async getEventsById (id) {
        try {
            await Validations.idValidation(id);

            const filters = Helpers.getFilters({id});

            const events = await this.db.search(filters,id);
            
            return events.map((e) => Event.parseEventFromDB(e));
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async getLastEventTypeById(id) {
        try {
            await Validations.idValidation(id);
        
            const filters = Helpers.getFilters({id});
            const events = await this.db.search(filters, id)
            let registerEvents = Helpers.reverseArray(events);
            const findedEvent = registerEvents[0];
            
            if(!findedEvent) return '';

            return findedEvent.type;
        } catch (error) {
            return Promise.reject(error);
        }
    }   

    async getElapsedTimeById (id) {
        try {
            await Validations.idValidation(id);
            const events = await this.getEventsById(id);

            if(!events?.length) throw new EventTrackerError('ID was not tracked');

            const startEvent = events.find((e) => e.type === 'start');
            const endEvent = events.find((e) => e.type === 'finish');

            if(!startEvent || !Object.keys(startEvent).length) throw new EventTrackerError('ID was not tracked')

            const startTime = startEvent.time;
            const currentTime = !!endEvent?.time ?  endEvent.time : new Date().toISOString();

            const elapsedTime = Helpers.getTimeDifference(startTime, currentTime);

            return elapsedTime

        } catch (error) {
            return Promise.reject(error);
        }
    }

    async deleteEventsById (id) {
        try {
            await Validations.idValidation(id);

            const filters = Helpers.getFilters({id});

            await this.db.delete(filters, id);
            
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
    * @name deleteAllEvents
    * @description delete all records from the database
    */
    async deleteAllEvents () {
        try {
            await this.db.deleteAll();
        } catch(error) {
            return Promise.reject(error);
        }
    }

    async _getAllIds() {
        try {
            const events = await this.db.search();
            const ids = events.map((ev) => (ev.id));
            const uniqueIds = [...new Set(ids)];

            return uniqueIds;
        } catch (error) {
            return Promise.reject(error)
        }
    }

    async _eventValidation (id,type) {
        if(!Validations.isValidEventType(type)) throw new EventTrackerError('Event type is invalid')

        const previousEvent = await this.getLastEventTypeById(id)

        return Validations.validateEventsSequence(type, previousEvent);
    }
}

export default EventTracker; 