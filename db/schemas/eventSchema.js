import Realm from "realm";

class EventSchema extends Realm.Object{
    static schema = {
        name: 'event',
        properties: {
            id: {type:'string', indexed: true},
            time: {type: 'date'},
            type:'string',
            payload: {type: 'mixed'}
        }
    }
}

export default EventSchema;
