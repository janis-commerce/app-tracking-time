jest.mock('date-fns', () => {
	const lib = jest.requireActual('date-fns');

	return {
		...lib,
	};
});