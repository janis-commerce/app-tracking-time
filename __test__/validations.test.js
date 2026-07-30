import Validations from '../utils/validations';

describe('Validations', () => {
	describe('isValidEventType', () => {
		it.each(['start', 'pause', 'resume', 'finish', 'START'])('accepts %s', (type) => {
			expect(Validations.isValidEventType(type)).toBe(true);
		});

		it('rejects an unknown type', () => {
			expect(Validations.isValidEventType('started')).toBe(false);
		});
	});

	describe('idValidation', () => {
		it('returns the id when it is a valid string', () => {
			expect(Validations.idValidation('123')).toBe('123');
		});

		it.each([null, '', 123])('throws with invalid id %s', (id) => {
			expect(() => Validations.idValidation(id)).toThrow('ID is invalid or null');
		});
	});

	describe('isValidISOString', () => {
		it('accepts a canonical ISO string with milliseconds and Z suffix', () => {
			expect(Validations.isValidISOString('2026-07-30T10:00:00.000Z')).toBe(true);
		});

		it('rejects a string that matches the format but is not a real date', () => {
			expect(Validations.isValidISOString('2026-02-30T10:00:00.000Z')).toBe(false);
		});

		it.each(['not-a-date', '2026-07-30 10:00:00', '2026-07-30T10:00:00.000-03:00'])(
			'rejects the non-canonical format %s',
			(date) => {
				expect(Validations.isValidISOString(date)).toBe(false);
			}
		);
	});

	describe('validateEventsSequence (multi-cycle state machine)', () => {
		describe('start', () => {
			it.each([undefined, 'finish'])('allows start when the previous event is %s', (previous) => {
				expect(() => Validations.validateEventsSequence('start', previous)).not.toThrow();
			});

			it('rejects start over an open cycle (previous start)', () => {
				expect(() => Validations.validateEventsSequence('start', 'start')).toThrow(
					'only one start record is allowed per cycle'
				);
			});

			it.each(['pause', 'resume'])('rejects start while a cycle is in progress (previous %s)', (previous) => {
				expect(() => Validations.validateEventsSequence('start', previous)).toThrow(
					'there is a cycle in progress'
				);
			});
		});

		describe('pause', () => {
			it.each(['start', 'resume'])('allows pause when the previous event is %s', (previous) => {
				expect(() => Validations.validateEventsSequence('pause', previous)).not.toThrow();
			});

			it('rejects pause when the record is already paused', () => {
				expect(() => Validations.validateEventsSequence('pause', 'pause')).toThrow(
					'record is already paused'
				);
			});

			it.each([undefined, 'finish'])('rejects pause when the previous event is %s', (previous) => {
				expect(() => Validations.validateEventsSequence('pause', previous)).toThrow(
					"record can't be paused"
				);
			});
		});

		describe('resume', () => {
			it('allows resume when the record is paused', () => {
				expect(() => Validations.validateEventsSequence('resume', 'pause')).not.toThrow();
			});

			it('rejects resume when the record is already being continued', () => {
				expect(() => Validations.validateEventsSequence('resume', 'resume')).toThrow(
					'the record is already being continued'
				);
			});

			it.each(['start', 'finish', undefined])('rejects resume when the previous event is %s', (previous) => {
				expect(() => Validations.validateEventsSequence('resume', previous)).toThrow(
					"record wasn't paused"
				);
			});
		});

		describe('finish', () => {
			it.each(['start', 'pause', 'resume'])('allows finish when the previous event is %s', (previous) => {
				expect(() => Validations.validateEventsSequence('finish', previous)).not.toThrow();
			});

			it('rejects finish when the record was never started', () => {
				expect(() => Validations.validateEventsSequence('finish', undefined)).toThrow(
					"record wasn't started"
				);
			});

			it('rejects finish over an already finished record', () => {
				expect(() => Validations.validateEventsSequence('finish', 'finish')).toThrow(
					'record is already finished'
				);
			});
		});
	});
});
