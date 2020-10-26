import _flatten from 'lodash/flatten.js';
import _last from 'lodash/last.js';
import _pull from 'lodash/pull.js';
import _without from 'lodash/without.js';
import Sector from './Sector.js';
import Waypoint from '../aircraft/Waypoint.js';

export default class SectorCollection {
    constructor(facilityId, sectorsData) {
        this._sectors = [];
        this._facilityId = facilityId;

        this._init(sectorsData);
    }

    get sectors() {
        return this._sectors;
    }

    _init(sectorsData) {
        for (const sectorId in sectorsData) {
            const sectorData = sectorsData[sectorId];
            const sector = new Sector(this._facilityId, sectorId, sectorData);

            this._sectors.push(sector);
        }
    }

    /**
     * Return an array of `Sector`s who own the airspace the provided Turf.js Point is within
     *
     * @for SectorCollection
     * @method getSectorsFromTurfPoint
     * @param {turf.point} turfPoint
     * @returns {array<Sector>}
     */
    getSectorsFromTurfPoint(turfPoint) {
        return this._sectors.filter((sector) => sector.isTurfPointInAirspace(turfPoint));
    }

    /**
     * Return a `Sector` instance within the collection who has the spcified sector id
     *
     * @for SectorCollection
     * @method getSectorWithId
     * @param {string} sectorId
     * @returns {Sector}
     */
    getSectorWithId(sectorId) {
        const sector = this._sectors.find((sector) => sector.id === String(sectorId));

        return sector;
    }

    /**
     * Return an array of `Waypoint`s for each position where the provided
     * Turf.js LineString intersects any polygon of any sector in the collection
     *
     * @for SectorCollection
     * @method getIntersectionsWithTurfLineString
     * @param {turf.lineString} turfLineString
     * @returns {array<Waypoint>}
     */
    getIntersectionsWithTurfLineString(turfLineString) {
        const intersections = _flatten(this._sectors.map((sector) => sector.getIntersectionsWithTurfLineString(turfLineString)));

        if (intersections.length === 0) {
            return [];
        }

        const waypoints = intersections.map((intersection) => {
            const coordinatesLonLat = intersection.point.geometry.coordinates;
            const coordinates = { lat: coordinatesLonLat[1], lon: coordinatesLonLat[0] };
            const waypointData = { ...coordinates, poly: intersection.poly };
            const waypoint = new Waypoint(waypointData);

            return waypoint;
        });

        return waypoints;
    }

    /**
     * Update the `timeTable`s AND `recursiveTimeTable`s for all `Sector`s
     *
     * @for SectorCollection
     * @method updateSectorTimeTables
     * @param aircraftCollection {AircraftCollection}
     * @returns {undefined}
     */
    updateSectorTimeTables(aircraftCollection) {
        const sectorChanges = aircraftCollection.getSectorChanges(); // [ { aircraft, waypoint } ]
        const sortedSectorChanges = sectorChanges.sort((a, b) => a.waypoint.time - b.waypoint.time);

        this._clearAllSectorTimeTables();

        for (const { aircraft, waypoint } of sortedSectorChanges) {
            // if (aircraft.callsign === 'AFT101') debugger;
            const { enter, exit } = waypoint.sectorChange;
            const timeInteger = waypoint.time.getTime();

            // ignore non-airborne aircraft by assuming slow a/c are on the
            if (aircraft.groundSpeed < 51) {
                continue;
            }

            // check for exits first, so any overwrites favor KEEPING the a/c in the count
            if (exit.length > 0) { // if exiting sector(s)
                for (const sector of exit) { // for each sector being exited
                    const parentSector = this._getParentOfSector(sector);
                    // TODO: Why did we want to do this? Disabling for now.
                    // if (sector.facilityId !== this._facilityId) { // if a sector of a different facility
                    //     continue;
                    // }

                    if (enter.includes(sector)) { // if exiting one shelf and entering another of the same sector
                        continue;
                    }

                    let previousAircraftList = [];
                    const previousTime = _last(Object.keys(sector.timeTable));

                    if (typeof previousTime !== 'undefined') {
                        previousAircraftList = sector.timeTable[previousTime];
                    }

                    if (!previousAircraftList.includes(aircraft)) {
                        if (aircraft.callsign === 'AFT101') debugger;
                        console.error('A/C detected to exit a sector they never entered. Something has probably ' +
                            `gone wrong. Skipping removal of ${aircraft.callsign} from sector ${sector.id}`);
                    }

                    const nextAircraftList = _without(previousAircraftList, aircraft);
                    sector.timeTable[timeInteger] = nextAircraftList;
                    const isEnteringParentSector = enter.includes(parentSector);
                    const isEnteringSiblingSector = parentSector.subSectors.some((sct) => enter.includes(sct));

                    if (isEnteringParentSector || isEnteringSiblingSector) {
                        continue; // do not log this as a sector exit in the recursive time table
                    }

                    let recursivePreviousAircraftList = [];
                    const recursivePreviousTime = _last(Object.keys(parentSector.recursiveTimeTable));

                    if (typeof recursivePreviousTime !== 'undefined') {
                        recursivePreviousAircraftList = parentSector.recursiveTimeTable[recursivePreviousTime];
                    }

                    if (!recursivePreviousAircraftList.includes(aircraft)) {
                        if (aircraft.callsign === 'AFT101') debugger;
                        console.error('A/C detected to exit a sector they never entered. Something has probably ' +
                            `gone wrong. Skipping removal of ${aircraft.callsign} from parent sector ${parentSector.id}`);
                    }

                    const recursiveNextAircraftList = _without(recursivePreviousAircraftList, aircraft);
                    parentSector.recursiveTimeTable[timeInteger] = recursiveNextAircraftList;
                }
            }

            if (enter.length > 0) { // if entering new sector(s)
                for (const sector of enter) { // for each sector being entered
                    const parentSector = this._getParentOfSector(sector);
                    // TODO: Why did we want to do this? Disabling for now.
                    // if (sector.facilityId !== this._facilityId) { // if a sector of a different facility
                    //     continue;
                    // }

                    if (exit.includes(sector)) { // if exiting one shelf and entering another of the same sector
                        continue;
                    }

                    let previousAircraftList = [];
                    const previousTime = _last(Object.keys(sector.timeTable));

                    if (typeof previousTime !== 'undefined') {
                        previousAircraftList = sector.timeTable[previousTime];
                    }

                    if (previousAircraftList.includes(aircraft)) {
                        if (aircraft.callsign === 'AFT101') debugger;
                        console.error('A/C detected to enter same sector twice. Something has probably ' +
                            `gone wrong. Skipping second entry for ${aircraft.callsign}.`);

                        _pull(previousAircraftList, aircraft);
                    }

                    // this will also work when two aircraft enter the sector at the exact same time.
                    // since we're processing them in chronological order, we'll just overwrite the same
                    // time table entry, adding all of the aircraft through each iteration
                    const nextAircraftList = [...previousAircraftList, aircraft];
                    sector.timeTable[timeInteger] = nextAircraftList;
                    const isExitingParentSector = exit.includes(parentSector);
                    const isExitingSiblingSector = parentSector.subSectors.some((sct) => exit.includes(sct));

                    if (isExitingParentSector || isExitingSiblingSector) {
                        continue; // do not log this as a sector entry in the recursive time table
                    }

                    let recursivePreviousAircraftList = [];
                    const recursivePreviousTime = _last(Object.keys(parentSector.recursiveTimeTable));

                    if (typeof recursivePreviousTime !== 'undefined') {
                        recursivePreviousAircraftList = parentSector.recursiveTimeTable[recursivePreviousTime];
                    }

                    if (recursivePreviousAircraftList.includes(aircraft)) {
                        if (aircraft.callsign === 'AFT101') debugger;
                        console.error('A/C detected to enter same sector twice. Something has probably ' +
                            `gone wrong. Skipping second entry for ${aircraft.callsign}.`);

                        _pull(recursivePreviousAircraftList, aircraft);
                    }

                    const recursiveNextAircraftList = [...recursivePreviousAircraftList, aircraft];
                    parentSector.recursiveTimeTable[timeInteger] = recursiveNextAircraftList;
                }
            }
        }
    }

    /**
     * Empty all sector time tables so they may be regenerated
     *
     * @for SectorCollection
     * @method _clearAllSectorTimeTables
     * @returns {undefined}
     * @private
     */
    _clearAllSectorTimeTables() {
        for (const sector of this._sectors) {
            sector.timeTable = {};
            sector.recursiveTimeTable = {};
        }
    }

    /**
     * Return the `Sector` instance who has the provided `Sector` listed as one of its subsectors
     *
     * @for SectorCollection
     * @method _getParentOfSector
     * @param {Sector} sector
     * @return {Sector}
     */
    _getParentOfSector(sector) {
        const parentSector = this._sectors.find((parentSector) => parentSector.subSectors.includes(sector));

        if (typeof parentSector === 'undefined') {
            return sector;
        }

        return parentSector;
    }
}
