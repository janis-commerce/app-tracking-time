# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Multi-cycle support: a record now accepts N `start → finish` cycles (a `start` right after a `finish` opens a new cycle)
- `EVENT_TYPES` is now exported from the package entry point (named export, the default export is unchanged) and used internally, so consumers stop repeating the type literals on their side
- `Helpers.sortValidEventsByTime`: single place that discards events with an invalid `time` and returns the rest in chronological order
- Beta publish workflow for pre-release branches

### Changed

- `getNetTrackingTime` now sums every active span (`start|resume → pause|finish`) across all cycles, instead of using only the first `start` and first `finish`
- `getNetTrackingTime` sorts events by time internally (storage order is not guaranteed) — this also neutralizes clock-regression spans
- **BREAKING**: `getNetTrackingTime` no longer counts a trailing open span against `now`: a record in progress contributes 0 for its open span (compute live time on the caller side). Release as a major version
- `finish` over an already finished record is now rejected (previously allowed, which could stack duplicate finish events)
- Widened the 100% coverage gate to every source file (`lib/**` and `utils/**`, excluding the Realm-native `database.js`) — it previously measured only `event-tracker.js`; added dedicated test suites for the state machine (`validations`), `helpers` and `event`
- **BREAKING**: moved realm from dependencies to peerDependencies — a consumer that does not declare it no longer receives it transitively. Release as a major version
- **BREAKING**: moved date-fns from dependencies to devDependencies (pinned to ^4.1.0 for CI) keeping the wide peer range: declaring it as both a dependency and a peer allowed npm to materialize a nested copy alongside the consumer's one. A consumer that does not declare date-fns no longer receives it transitively: `npm install` resolves peers on its own, but with `--legacy-peer-deps` (or yarn 1) it is not installed and nothing is reported at install time — the `import` fails at runtime with `Cannot find module 'date-fns'`. Release as a major version
- Widened realm peer dependency range to ^11.0.0 || ^20.0.0
- Widened date-fns range from <3.0.0 to <5.0.0
- Widened react-native peer dependency range to >=0.71.5 <0.82.0
- Widened react peer dependency range to >=18.2.0 <20.0.0
- Standardized Node.js to v22 in .nvmrc and all CI workflows
- Upgraded GitHub Actions to v4 (checkout, setup-node)

### Fixed

- `getEventsById` now returns events in chronological order (storage order is not guaranteed) — consumers no longer need to re-sort
- `getLastEventById` now sorts events by time before picking the last one — storage order is not guaranteed, and a stale read there mis-validated cycle transitions (it could block reopening a finished record)
- `getIdTimeByType` now sorts events by time before picking the last one — with multi-cycle records (N events of the same type per id) the unsorted read could return a stale event's time
- `getIdTimeByType` now resolves `null` when there are no events for the id and type, as documented (it used to reject with a TypeError)
- `getNetTrackingTime` ignores events with an invalid `time` instead of collapsing the whole record to 0
- `getNetTrackingTime` with `format: true` now always returns the `{days, hours, minutes, seconds}` object, including for in-progress records whose net time is 0 (it used to leak the raw number `0`)
- The event type is now normalized before being validated, stored and queried: an unnormalized type (`'START'`) matched no `case` of the state machine, so the event skipped the sequence validation entirely, was stored as received and then contributed 0 to the net time because the span never opened
- `validateEventsSequence` now rejects an unknown type through its `default` branch instead of silently accepting it
- `isValidEventType` now returns `false` for a non-string type, so `addEvent` without a type rejects with an `EventTrackerError` as documented instead of throwing a `TypeError`
- `getIdTimeByType` now queries storage with the normalized type — the Realm filter compares it case-sensitively, so an uppercased type found no record even when the data was fine
- `getEventsById`, `getLastEventById` and `getIdTimeByType` now discard events with an invalid `time` before sorting, as `getNetTrackingTime` already did: the comparator returns `NaN` against an invalid date, which left the read unsorted and made the result depend on storage order

### Removed

- **BREAKING**: `getStoppedTime`. It was orphaned by the `getNetTrackingTime` rewrite (spans are summed one by one, so there is nothing to subtract), had no consumer, mutated the events it received and assumed chronological order without sorting. Release as a major version
- **BREAKING**: `removeFinishById`. Deleting finish events corrupts multi-cycle histories: it deleted EVERY finish of the id, losing already-closed cycles. To rework a finished record, open a new cycle with a `start` event. Release as a major version
- **BREAKING**: `isEventStarted`. It answered "does this record have any `start`?", which with multi-cycle records is true even when every cycle is already closed — the useful question became "is a cycle open?", answered by checking whether the last event is a `start` or a `resume`. It had no consumer and was not documented. Release as a major version
- Internal helpers `findEventByStatus` and `reverseArray` (orphaned by the `getNetTrackingTime` rewrite and the `getLastEventById` fix)

## [2.3.0] - 2025-11-06

### Added

- support up to react 19

## [2.2.2] - 2025-08-25

### Fixed

- vulnerabilities in tar-fs package

## [2.2.1] - 2025-08-13

### Fixed

- An error in which data from db was not being parsed

## [2.2.0] - 2025-08-06

### Added

- Method to search event by custom queries

## [2.1.0] - 2025-07-23

### Added

- Close db in Database methods

## [2.0.0] - 2025-05-19

### Removed

- Automatic pausing when going to background app state

## [1.4.0] - 2025-04-03

### Added

- getStoppedTime.
- getNetTrackingTime.

### Changed

- getElapsedTime receive format param.

## [1.3.0] - 2024-11-14

### Added

- Added method setFocus.

## [1.2.1] - 2024-11-11

### Fixed

- Fixed getIdTimeByType method.

## [1.2.0] - 2024-11-08

### Added

- Added method to remove events database folder.

### Changed

- Changed getElapsedTime to calculate elapsed time from two dates received by params.

## [1.1.0] - 2024-09-26

### Changed

- Event validation update: Now only allows adding finish events after tracking is completed.
- \_stopEventsInBackground improvement: Added validation to pause only active events
- getElapsedTime adjustment: Time calculations now use the last finish event when multiple are present.

### Added

- Added removeFinishById method to delete all finish records by ID, returning a rejected promise on failure

## [1.0.0] - 2024-09-19

### Added

- Added a class that tracks actions with its current time
