class EventTrackerError extends Error {
    constructor(error) {
        const message = error.message || error

        super(message);
        this.message = message;
    }
}

export default EventTrackerError;