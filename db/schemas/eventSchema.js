import Realm from "realm";

class EventSchema extends Realm.Object{
    static schema = {
        name: 'event',
        properties: {
            id: {type:'string', indexed: true},
            time: {type: 'date'},
            type: {type: 'string'},
            payload: {type: 'string'}
        }
    }
}

export default EventSchema;
