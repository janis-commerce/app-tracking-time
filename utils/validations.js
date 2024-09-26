import EventTrackerError from "../lib/event-tracker-error";
import Helpers from "./helpers";

class Validations {
    /**
     * @name isValidEventType
     * @description returns a boolean indicating whether the type is valid or not
     * @param {string} type 
     * @returns {boolean}
     * 
     * @example 
     *  Event.isValidEventType('start') => true;
     *  Event.isValidEventType('START') => true;
     *  Event.isValidEventType('started') => false;
     */
    static isValidEventType (type) {
        const validTypes = ['start','pause','resume','finish']

        return validTypes.includes(type.toLowerCase());
    }

    static idValidation (id) {
        if(!id || !Helpers.isString(id)) throw new EventTrackerError('ID is invalid or null');

        return id;
    }

    static isValidISOString(date) {
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
        if (!isoRegex.test(date)) return false;
    
        const parsedDate = new Date(date);
        return parsedDate.toISOString() === date;
    }

    static validateEventsSequence (type,previousType = '') {

        if(previousType === 'finish' && type !== 'finish') throw new EventTrackerError(`Forbidden event: record is already finished`)
        switch(type) {
            case 'start': 
                if(previousType === 'start') throw new EventTrackerError(`Forbidden event: only one start record is allowed`);

                if(previousType !== '') throw new EventTrackerError(`Forbidden event: there are already records stored`);
                break;
                
            case 'pause': 
                let validPreviousTypes = ['start','resume'];

                if(previousType === 'pause') throw new EventTrackerError(`Forbidden event: record is already paused`);

                if(!previousType || !validPreviousTypes.includes(previousType)) throw new EventTrackerError("Forbidden event: record can't be paused")
                break;
                
            case 'resume': 
                if(previousType === 'resume') throw new EventTrackerError(`Forbidden event: the record is already being continued`);

                if(previousType !== 'pause') throw new EventTrackerError("Forbidden event: record wasn't paused");
                break;
            
            case 'finish': 
                if(previousType === '') throw new EventTrackerError(`Forbidden event: record wasn't started`);
                break;
        }

    }
}

export default Validations;