import {isSameDay, differenceInMilliseconds} from 'date-fns';

 class Helpers {
    static isString(str) {
        return !!(typeof str === 'string') && !!str.length;
    }

    static isObject(obj) {
        return  !!(obj && obj.constructor === Object);
    }

    /**
     * 
     * @param {Array} arr 
     */
    static reverseArray(arr) {
        return arr.reverse()
    }

    static findEventByStatus(arr, status) {
        return arr.find((value) => value?.type === status)
    }

    static reverseArray (arr) {
        return arr.slice().reverse()
    }

    static getTimeDifference (start, end) {
        const parsedStart = new Date(start);
        const parsedEnd = new Date(end);
        const sameDay = isSameDay(parsedStart, parsedEnd);
        const miliseconds = differenceInMilliseconds(parsedEnd, parsedStart);
        const seconds = Math.floor(miliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        
        const days = sameDay ? 0 : Math.floor(hours / 24);
        const minutes = Math.floor((seconds % 3600) / 60);
        const restSeconds = seconds % 60;
        const restHours = hours % 24;


        const formatDifference = {
            days,
            hours: restHours,
            minutes,
            seconds: restSeconds
        }

        return formatDifference;
    }

    static getFilters(values) {
        const {id, type} = values;
        const validID = id && this.isString(id);
        const validType = type && this.isString(type);
        let filters = '';

        if(validID) {
            filters = filters.concat("id LIKE[c] $0")
        }

        if(validID && validType) {
            filters = filters.concat(" && type = $1")
        }

        if(!validID && validType) {
            filters = filters.concat("type = $0")
        }

        return filters;
    }

    static promiseWrapper(promise) {
        return promise.then((data) => [data, null]).catch((error) => Promise.resolve([null, error]));
    }
}

export default Helpers;