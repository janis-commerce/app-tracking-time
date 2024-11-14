import EventTracker from "../lib/event-tracker";
import Database from "../lib/database";
import Helpers from "../utils/helpers";

jest.mock('../lib/database')

describe('EventTracker class', () => { 

    const DEFAULT_ELAPSED_TIME = {
        days: 0,
        hours: 0,
        minutes:0,
        seconds: 0,
    }

    const eventTracker = new EventTracker('timetracker');
    const saveFn = Database.prototype.save;
    const searchFn = Database.prototype.search;
    const deleteFn = Database.prototype.delete;
    const deleteAllFn = Database.prototype.deleteAll;
    const removeDatabaseFolderFn = Database.prototype.removeDatabaseFolder;

    const diffTimeMock = jest.spyOn(Helpers,'getTimeDifference')
    const mockDate = new Date('2023-01-01T00:15:00.000Z');
    jest.spyOn(console, 'warn').mockImplementation(() => {});

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

    describe('getLastEventById mehtod', () => { 
        describe('throws an error', () => { 
            it('when received id is invalid', () => {
                expect(eventTracker.getLastEventById(null)).rejects.toThrow('ID is invalid or null')
            })
        })
        
        it('return last event type registered', async () => {
            searchFn.mockResolvedValueOnce([
                {id:'345',type:'start'},
                {id:'345',type:'pause'},
                {id:'345',type:'resume',payload: '{"userId":"123","warehouseId":"123-wh"}', time:'2023-01-01T00:00:00.000Z'}
            ]);

            const typeResponse = await eventTracker.getLastEventById('345');

            expect(typeResponse).toStrictEqual({id:'345',type:'resume',time:'2023-01-01T00:00:00.000Z',payload: {userId:'123',warehouseId:'123-wh'}});
        })
    })

    describe('getElapsedTime method', () => {

        describe('return default elapsedTime', () => { 
            it('should return default elapsedTime when startTime is null', () => {
                expect(eventTracker.getElapsedTime()).toStrictEqual(DEFAULT_ELAPSED_TIME)
            })
         })

        describe('return elasped time', () => { 
            it('between started time and finish time', () => {
                const startTime = '2023-01-01T00:00:00.000Z';
                const finishTime = '2023-01-01T00:30:00.000Z'

                diffTimeMock.mockReturnValueOnce({
                    days:0,
                    hours:0,
                    minutes:30,
                    seconds:0
                })

                const response = eventTracker.getElapsedTime(startTime,finishTime)
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

            diffTimeMock.mockReturnValueOnce({
                days:0,
                hours:0,
                minutes:15,
                seconds:0
            })

            const startTime = '2023-01-01T00:00:00.000Z';

            const response = eventTracker.getElapsedTime(startTime)

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

    describe('isEventStarted method', () => { 
        describe('throws an error when', () => { 
            it('id is invalid or null', () => {
                expect(eventTracker.isEventStarted()).rejects.toThrow('ID is invalid or null')
            })
        })

        describe('returns a boolean indicating whether the id was started or not', () => { 
            it('if id is started, return true', async () => {
                searchFn.mockResolvedValueOnce([{id:'123',type:'start'}])

                const response = await eventTracker.isEventStarted('123');

                expect(response).toBeTruthy()
            })

            it('return false when the id wasnt initialized', async () => {
                searchFn.mockResolvedValueOnce([]);
                const response = await eventTracker.isEventStarted('345');

                expect(response).toBeFalsy();
                
            })
        })
    })

    describe('stopEventsInBackground method', () => { 
        describe('throws an error when', () => { 
            it('database search fails', async () => {
                searchFn.mockRejectedValueOnce('error');

                const [, error] = await Helpers.promiseWrapper(
                    eventTracker._stopEventsInBackground()
                )

                expect(error.message).toStrictEqual('error')
            })
         })

         describe('return empty array when', () => { 
            it('database ids were not obtained', async () => {
                searchFn.mockResolvedValueOnce([]);

                const response = await eventTracker._stopEventsInBackground();

                expect(response).toStrictEqual([])
            })
        })

        describe('return an array with paused times when', () => { 
            it('ids are valid and this is not paused', async () => {
                saveFn
                    .mockResolvedValueOnce({})

                searchFn
                    .mockResolvedValueOnce([{id:'12345',type:'start'},{id:'234',type:'start'},{id:'234',type:'pause'}])
                    .mockResolvedValueOnce([{id:'12345',type:'start'}])
                    .mockResolvedValueOnce([{id:'12345',type:'start'}])
                    .mockResolvedValueOnce([{id:'234',type:'start'},{id:'234',type:'pause'}])
                
                

                const response = await eventTracker._stopEventsInBackground();

                expect(response.length).toBe(1);
            })

            it('ignore elements that throws errors when try to obtain last event',  async () => {

                searchFn
                    .mockResolvedValueOnce([{id:'12345',type:'start'},{id:'234',type:'start'},{id:'234',type:'pause'}])
                    .mockRejectedValueOnce(new Error('database error'))
                    .mockResolvedValueOnce([{id:'234',type:'start'},{id:'234',type:'pause'}])
                

                const response = await eventTracker._stopEventsInBackground();

                expect(response).toStrictEqual([])
            })

            it('ignore elements that throws errors when try to obtain last event',  async () => {
                searchFn
                    .mockResolvedValueOnce([{id:'12345',type:'start'},{id:'234',type:'start'},{id:'234',type:'pause'}])
                    .mockResolvedValueOnce([{id:'12345',type:'start'}])
                    .mockRejectedValueOnce(new Error('database error'))
                    .mockResolvedValueOnce([{id:'234',type:'start'},{id:'234',type:'pause'}])
                

                const response = await eventTracker._stopEventsInBackground();

                expect(response).toStrictEqual([])
            })

            it('ignore elements that throws errors when try to obtain last event',  async () => {
                saveFn
                    .mockRejectedValueOnce(new Error('invalid id'))
                searchFn
                    .mockResolvedValueOnce([{id:'12345',type:'start'},{id:'234',type:'start'},{id:'234',type:'pause'}])
                    .mockResolvedValueOnce([{id:'12345',type:'start'}])
                    .mockRejectedValueOnce(new Error('database error'))
                    .mockResolvedValueOnce([{id:'234',type:'start'},{id:'234',type:'pause'}])
                

                const response = await eventTracker._stopEventsInBackground();

                expect(response).toStrictEqual([])
            })
        })
    })

    describe('removeFinishById method', () => { 
        it('remove finish event when delete database method resolved correctly', async () => {
            deleteFn.mockResolvedValueOnce();

            await eventTracker.removeFinishById('123')

            expect(deleteFn).toHaveBeenCalled();
        })

        it('return a reject promise when delete method fails', async () => {
            deleteFn.mockRejectedValueOnce(new Error('delete error'));

            await expect(eventTracker.removeFinishById('123')).rejects.toThrow('delete error')
        })
    })

    describe('getIdTimeByType method', () => { 
        describe('throws an error when', () => { 
            it('passed id is invalid',async () => {
                expect(eventTracker.getIdTimeByType()).rejects.toThrow('ID is invalid or null') 
            })

            it('passed type is invalid',async () => {
                expect(eventTracker.getIdTimeByType('123','fakeStart')).rejects.toThrow("Event type is invalid") 
            })
        })

        describe('return null', () => { 
            it('should return null when finded event not contains time key', async () => {
                searchFn.mockResolvedValueOnce([{id:'123',type:'start',payload:{}}])

                const time = await eventTracker.getIdTimeByType('123','start');

                expect(time).toBeNull();
            })
         })

        describe('return time value', () => { 
            it('should return time register value when has valid type, valid id and valid time', async () => {
                searchFn.mockResolvedValueOnce([{id:'123',type:'start',payload:{}, time: '2023-01-02T00:00:00.000Z'}])

                const time = await eventTracker.getIdTimeByType('123','start');

                expect(time).toStrictEqual('2023-01-02T00:00:00.000Z')
            })
         })
     })

    describe('removeEventsFolder method', () => { 
        describe('delete database', () => { 
            it('should delete database if removeDatabase complete successfully', async () => {
                removeDatabaseFolderFn.mockResolvedValueOnce();

                await eventTracker.removeEventsFolder();

                expect(removeDatabaseFolderFn).toHaveBeenCalled();
            })

            it('should return a reject promise when remove method fails', async () => {
                removeDatabaseFolderFn.mockRejectedValueOnce(new Error('delete error'));

                await expect(eventTracker.removeEventsFolder()).rejects.toThrow('delete error')
            })
         })
    })

    describe('isFocused getter and setFocused setter', () => { 
        it('should return _appFocused property value', () => {
            const state = eventTracker.isFocused;

            expect(typeof state).toStrictEqual('boolean')


        })

        it('should set new _appFocused state', () => {
            eventTracker.setFocus = true;
            const state = eventTracker.isFocused;

            expect(state).toBeTruthy();
        }) 

        it('shouldn t set new appFocused state if value isnt a boolean', () => {
            eventTracker.setFocus = 3;
            const state = eventTracker.isFocused;

            expect(state).toBeTruthy();
        })
     })
 })