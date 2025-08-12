# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- _stopEventsInBackground improvement: Added validation to pause only active events
- getElapsedTime adjustment: Time calculations now use the last finish event when multiple are present.

### Added

- Added removeFinishById method to delete all finish records by ID, returning a rejected promise on failure

## [1.0.0] - 2024-09-19

### Added

- Added a class that tracks actions with its current time