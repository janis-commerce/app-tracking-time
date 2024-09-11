import Helpers from "../utils/helpers";
import Validations from "../utils/validations";

class Event {
    static create(id,type,time = '',payload = {}) {

        const validTime = Validations.isValidISOString(time) ? time : new Date().toISOString();        
        const validPayload = Helpers.isObject(payload) ? payload : {};

        return {
            id: id,
            type: type,
            time: validTime,
            payload: validPayload
        }
    }

    static parseEventForDB(event) {
        const {id, type, time, payload} = event;
        let parsedPayload;

        try {
            parsedPayload = JSON.stringify(payload);
        } catch(error) {
            parsedPayload = JSON.stringify({})
        }

        return {
            id,
            type,
            time,
            payload: parsedPayload
        }
    }

    static parseEventFromDB(event) {
        const {id, type, time, payload} = event;
        let parsedPayload;

        try {
            parsedPayload = JSON.parse(payload);
        } catch(error) {
            parsedPayload = payload;
        }

        return {
            id,
            type,
            time,
            payload: parsedPayload
        }
    }
}

export default Event;