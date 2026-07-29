# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Multi-cycle support: a record now accepts N `start → finish` cycles (a `start` right after a `finish` opens a new cycle)
- Beta publish workflow for pre-release branches

### Changed

- `getNetTrackingTime` now sums every active span (`start|resume → pause|finish`) across all cycles, instead of using only the first `start` and first `finish`
- `getNetTrackingTime` sorts events by time internally (storage order is not guaranteed) — this also neutralizes clock-regression spans
- **BREAKING**: `getNetTrackingTime` no longer counts a trailing open span against `now`: a record in progress contributes 0 for its open span (compute live time on the caller side). Release as a major version
- `finish` over an already finished record is now rejected (previously allowed, which could stack duplicate finish events)
- Moved realm from dependencies to peerDependencies
- Widened realm peer dependency range to ^11.0.0 || ^20.0.0
- Widened date-fns range from <3.0.0 to <5.0.0
- Widened react-native peer dependency range to >=0.71.5 <0.82.0
- Widened react peer dependency range to >=18.2.0 <20.0.0
- Standardized Node.js to v22 in .nvmrc and all CI workflows
- Upgraded GitHub Actions to v4 (checkout, setup-node)

### Fixed

- `getLastEventById` now sorts events by time before picking the last one — storage order is not guaranteed, and a stale read there mis-validated cycle transitions (it could block reopening a finished record)
- `getNetTrackingTime` ignores events with an invalid `time` instead of collapsing the whole record to 0
- `getNetTrackingTime` with `format: true` now always returns the `{days, hours, minutes, seconds}` object, including for in-progress records whose net time is 0 (it used to leak the raw number `0`)

### Deprecated

- `removeFinishById`: deleting finish events corrupts multi-cycle histories; open a new cycle with a `start` event instead

### Removed

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
