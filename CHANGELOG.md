# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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