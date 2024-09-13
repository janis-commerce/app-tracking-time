import EventTracker from "../lib/event-tracker";
import Database from "../lib/database";
import Helpers from "../utils/helpers";

jest.mock('../lib/database')
describe('EventTracker class', () => { 

    const eventTracker = new EventTracker('timetracker');
    const searchFn = Database.prototype.search;
    const deleteFn = Database.prototype.delete;
    const deleteAllFn = Database.prototype.deleteAll;

    const diffTimeMock = jest.spyOn(Helpers,'getTimeDifference')
    const mockDate = new Date('2023-01-01T00:15:00.000Z');

    describe('return methods to handler time events', () => { 
        it('when the class is instantiated', () => {

            expect(typeof eventTracker.addEvent).toBe('function');
        })
    })

    describe('addEvent method', () => { 
        describe('throws an error when', () => { 
            it('passed id is invalid',async () => {

                expect(eventTracker.addEvent({id:null})).rejects.toThrow('ID is invalid or null') 
            })

            it('passed type is invalid',async () => {

                expect(eventTracker.addEvent({id:'123',type:'fakeStart'})).rejects.toThrow("Event type is invalid") 
            })
        })

        describe('add an event when', () => { 
            it('id and type are valids', async () => {
                searchFn.mockResolvedValueOnce([]);
                const response = await eventTracker.addEvent({id:'345',type:'start'})
                expect(response).toBeTruthy()
            })
        })
    })

    describe('addManyEvents method', () => { 
        describe('throws an error when', () => { 
            it('first argument isnt an array', () => {
                expect(eventTracker.addManyEvents({},'start')).rejects.toThrow(`an array of ids was expected`)
            })
         })

         describe('return an object with', () => { 
            it('created events time and ids, and an errors array with id and error',async () => {
                searchFn
                    .mockResolvedValueOnce([{'id':'345',type:'start'}])
                    .mockResolvedValueOnce([])


                const response = await eventTracker.addManyEvents(['345','456'],'start');
                const {createdEvents, errors} = response;
                
                expect(createdEvents.length).toBe(1);
                expect(errors.length).toBe(1);
            })
          })
    })

    describe('getEventsById method', () => { 
        describe('throws an error when', () => { 
            it('id isnt valid', () => {
                expect(eventTracker.getEventsById(12345)).rejects.toThrow('ID is invalid or null')
            })
        })
        
        describe('return an array with', () => { 
            it('related events when id is valid', async () => {
                searchFn.mockResolvedValueOnce([
                    {id:'345',type:'start',time:'2023-01-01T00:00:00.000Z', payload:'{}'},
                    {id:'345',type:'pause',time:'2023-01-01T00:00:00.000Z', payload:'{}'}
                ]);

                const response = await eventTracker.getEventsById('345');

                expect(response).toStrictEqual([
                    {id:'345',type:'start',time:'2023-01-01T00:00:00.000Z', payload:{}},
                    {id:'345',type:'pause',time:'2023-01-01T00:00:00.000Z', payload:{}}
                ])
            })
         })
    })

    describe('getLastEventTypeById mehtod', () => { 
        describe('throws an error', () => { 
            it('when received id is invalid', () => {
                expect(eventTracker.getLastEventTypeById(null)).rejects.toThrow('ID is invalid or null')
            })
        })
        
        it('return last event type registered', async () => {
            searchFn.mockResolvedValueOnce([
                {id:'345',type:'start'},
                {id:'345',type:'pause'},
                {id:'345',type:'resume'}
            ]);

            const typeResponse = await eventTracker.getLastEventTypeById('345');

            expect(typeResponse).toStrictEqual('resume');
        })
    })

    describe('getElapsedTimeById method', () => {
        describe('throws an eror when', () => { 
            it('received id is invalid', () => {
                expect(eventTracker.getElapsedTimeById()).rejects.toThrow('ID is invalid or null');
            })

            it('id hasnt events tracked in database', async () => {
                searchFn.mockResolvedValueOnce([]);
                await expect(eventTracker.getElapsedTimeById('345')).rejects.toThrow('ID was not tracked');
            })

            it('id was tracked but hasnt started time', async () => {
                searchFn.mockResolvedValueOnce([
                    {id:'345',type:'pause'},
                    {id:'345',type:'resume'}
                ])

                await expect(eventTracker.getElapsedTimeById('345')).rejects.toThrow('ID was not tracked');
            })
        })

        describe('return elasped time', () => { 
            it('between started time and finish time', async () => {
                searchFn.mockResolvedValueOnce([
                    {id:'345',type:'start',time:'2023-01-01T00:00:00.000Z'},
                    {id:'345',type:'finish',time:'2023-01-01T00:30:00.000Z'}
                ])

                diffTimeMock.mockReturnValueOnce({
                    days:0,
                    hours:0,
                    minutes:30,
                    seconds:0
                })

                const response = await eventTracker.getElapsedTimeById('345')
                expect(response).toStrictEqual({
                    days:0,
                    hours:0,
                    minutes:30,
                    seconds:0
                })
            })
         })

         it('but, if the id hasnt finish time, la comparación se realizará contra la hora actual', async () => {
            jest.spyOn(mockDate, 'toISOString').mockReturnValueOnce('2023-01-01T00:15:00.000Z');
            searchFn.mockResolvedValueOnce([
                {id:'345',type:'start',time:'2023-01-01T00:00:00.000Z'},
            ])

            diffTimeMock.mockReturnValueOnce({
                days:0,
                hours:0,
                minutes:15,
                seconds:0
            })

            const response = await eventTracker.getElapsedTimeById('345')
            expect(response).toStrictEqual({
                days:0,
                hours:0,
                minutes:15,
                seconds:0
            })
         })
    })

    describe('deleteEventsById method', () => { 
        describe('throws an error when', () => { 
            it('id is invalid or null', () => {
                expect(eventTracker.deleteEventsById()).rejects.toThrow('ID is invalid or null');
            })
        })

        describe('delete events related to id', () => { 
            it('when the request complete successfully', async () => {
                deleteFn.mockResolvedValueOnce();

                await eventTracker.deleteEventsById('123')

                expect(deleteFn).toHaveBeenCalled();
            })
         })
    })

    describe('deleteAllEvents method', () => { 
        describe('throws an error when  ', () => { 
            it('delete fails', async () => {
                deleteAllFn.mockRejectedValueOnce('error');

                const [, error] = await Helpers.promiseWrapper(
                    eventTracker.deleteAllEvents()
                )

                expect(error).toStrictEqual('error')
            })
        })

        describe('wipe database when', () => {
            it('database request complete successfully', async () => {
                deleteAllFn.mockResolvedValueOnce();

                await eventTracker.deleteAllEvents();

                expect(deleteAllFn).toHaveBeenCalled();
            })
        })
    })

    describe('isEventAlreadyStarted method', () => { 
        describe('throws an error when', () => { 
            it('id is invalid or null', () => {
                expect(eventTracker.isEventAlreadyStarted()).rejects.toThrow('ID is invalid or null')
            })
        })

        describe('returns a boolean indicating whether the id was started or not', () => { 
            it('if id is started, return true', async () => {
                searchFn.mockResolvedValueOnce([{id:'123',type:'start'}])

                const response = await eventTracker.isEventAlreadyStarted('123');

                expect(response).toBeTruthy()
            })

            it('return false when the id wasnt initialized', async () => {
                searchFn.mockResolvedValueOnce([]);
                const response = await eventTracker.isEventAlreadyStarted('345');

                expect(response).toBeFalsy();
                
            })
        })
    })

    describe('stopEventsInBackground method', () => { 
        describe('throws an error when', () => { 
            it('database search fails', async () => {
                searchFn.mockRejectedValueOnce('error');

                const [, error] = await Helpers.promiseWrapper(
                    eventTracker.stopEventsInBackground()
                )

                expect(error.message).toStrictEqual('error')
            })
         })

         describe('return null when', () => { 
            it('database ids were not obtained', async () => {
                searchFn.mockResolvedValueOnce([]);

                const response = await eventTracker.stopEventsInBackground();

                expect(response).toBeNull();
            })
        })

        describe('return an array with paused times when', () => { 
            it('ids are valid and this is not paused', async () => {
                searchFn
                    .mockResolvedValueOnce([{id:'12345',type:'start'},{id:'234',type:'start'},{id:'234',type:'pause'}])
                    .mockResolvedValueOnce([{id:'12345',type:'start'}])
                    .mockResolvedValueOnce([{id:'234',type:'start'},{id:'234',type:'pause'}])

                const response = await eventTracker.stopEventsInBackground();

                expect(response).toBeTruthy();
            })
         })
     })
 })