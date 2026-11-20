# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-11-20

### Added

- Multi-cycle tracking: a record holds several `start → finish` cycles, so reworking a closed item opens a new cycle instead of erasing the previous ones, and the net time adds up every active span (https://janiscommerce.atlassian.net/browse/ATR-2523)
- The event types are exported (`EVENT_TYPES`), so apps use the package's vocabulary instead of repeating the literals (https://janiscommerce.atlassian.net/browse/ATR-2523)

### Changed

- **BREAKING**: the net time of a record in progress no longer counts its open span against the current time: the app computes the live time on its side (https://janiscommerce.atlassian.net/browse/ATR-2523)
- **BREAKING**: a `finish` over an already finished record is rejected instead of stacking duplicate finishes (https://janiscommerce.atlassian.net/browse/ATR-2523)
- Event reads return the events in chronological order and skip the ones with an invalid time, and an event timestamped before the record's last one (a device clock that went back) is stored right after it so the sequence keeps validating (https://janiscommerce.atlassian.net/browse/ATR-2523)
- **BREAKING**: `realm`, `date-fns` and `react-native-fs` are now peer dependencies the app must declare. Realm 12 or 20 is required (Realm 11 is no longer supported); with a missing peer, Metro fails to bundle
- Compatible with React Native up to 0.81 and React 19

### Fixed

- Event types written in uppercase are now validated and stored like lowercase ones, and looking up the last time of a type with no events resolves `null` instead of failing (https://janiscommerce.atlassian.net/browse/ATR-2523)

### Removed

- **BREAKING**: `isEventStarted`, `getStoppedTime` and `removeFinishById`. To rework a finished record, add a new `start` (https://janiscommerce.atlassian.net/browse/ATR-2523)

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
