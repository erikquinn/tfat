import _last from 'lodash/last.js';
import bearing from '@turf/bearing';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import distance from '@turf/distance';
import { lineString, convertLength, bearingToAzimuth } from '@turf/helpers';
import NavigationLibrary from '../navData/NavigationLibrary.js';
import Waypoint from './Waypoint.js';
import { TURF_LENGTH_UNIT } from '../constants/turfConstants.js';
import { calculateAngleDifference, distanceNm, bearing360 } from '../clientUtilities.js';
import { MAX_TURN_ANGLE_BEFORE_SKIPPING_FIX_DEG } from '../constants/routeConstants.js';
import { TIME } from '../../globalConstants.js';
import { FIXES_TO_IGNORE, ROUTES_TO_REPLACE } from '../constants/clientConstants.js';

/**
 * A representation of the filed flight plan route of a given `Aircraft`
 *
 * @class Route
 */
export default class Route {
    constructor(data) {
        /**
         * The ICAO identifier of the origin airport, if one exists
         *
         * @for Route
         * @property _origin
         * @type {string}
         * @private
         */
        this._origin = data.origin;

        /**
         * The ICAO identifier of the destination airport, if one exists
         *
         * @for Route
         * @property _destination
         * @type {string}
         * @private
         */
        this._destination = data.destination;

        /**
         * The current ground speed (in knots) of the `Aircraft` this `Route` belongs to
         *
         * @for Route
         * @property _groundSpeedOfAircraft
         * @type {number} - speed, in knots
         * @private
         */
        this._groundSpeedOfAircraft = data.groundSpeed;

        /**
         * Textual representation of the route, including ALL elements in their filed flight plan,
         * regardless of which elements for which we are actually able to look up a location
         *
         * @for Route
         * @property _routeString
         * @type {string}
         * @private
         */
        this._routeString = data.routeString.trim();

        /**
         * A Turf.js `lineString` object, containing points at all recognized (and interpolated) waypoints
         *
         * @for Route
         * @property _turfLineString
         * @type {turf.lineString}
         * @private
         */
        this._turfLineString = null;

        /**
         * A JS Date object representing the time VATSIM captured the network data we are updating with
         *
         * @for Route
         * @property _updateTime
         * @type {Date}
         * @private
         */
        this._updateTime = data.updateTime;

        /**
         * Array of `Waypoint`s, ordered from beginning to end of the route, including interpolated waypoints
         *
         * @for Route
         * @property _waypoints
         * @type {array<Waypoint>}
         * @private
         */
        this._waypoints = [];

        this._init(data);
    }

    /**
     * Time the aircraft is projected to arrive at the last fix in the route
     *
     * @for Route
     * @property eta
     * @type {Date}
     */
    get eta() {
        return _last(this._waypoints).time;
    }

    /**
     * A Turf.js `lineString` object, containing points at all recognized (and interpolated) waypoints
     *
     * @for Route
     * @property turfLineString
     * @type {turf.lineString}
     */
    get turfLineString() {
        return this._turfLineString;
    }

    /* ----------------------------- LIFECYCLE ----------------------------- */

    /**
     * Initialize the instance
     *
     * @for Route
     * @method _init
     * @param {object} data
     * @returns {undefined}
     * @private
     */
    _init(data) {
        this._initWaypoints(data);
        this._updateTurfLineStringFromWaypoints();
    }

    /**
     * Initialize the waypoints on the route
     *
     * @for Route
     * @method _initWaypoints
     * @param {object} - in the shape of { aircraftPosition, organizationCollection }, where...
     *                   aircraftPosition {object} = { lat: 41.176208, lon: -83.622404 }
     *                   organizationCollection {OrganizationCollection}
     * @returns {undefined}
     * @private
     */
    _initWaypoints({ aircraftPosition, organizationCollection }) {
        const originAirport = NavigationLibrary.getAirportWithIcao(this._origin);

        if (typeof originAirport !== 'undefined') {
            const originAirportWaypoint = new Waypoint(originAirport);

            this._waypoints.push(originAirportWaypoint);
        }

        const routeFixes = this._getFixesFromRouteString();

        if (typeof routeFixes !== 'undefined') {
            const routeFixWaypoints = routeFixes.map((fix) => new Waypoint(fix));

            this._waypoints.push(...routeFixWaypoints);
        }

        const destinationAirport = NavigationLibrary.getAirportWithIcao(this._destination);

        if (typeof destinationAirport !== 'undefined') {
            const destinationAirportWaypoint = new Waypoint(destinationAirport);

            this._waypoints.push(destinationAirportWaypoint);
        }

        this._removeDuplicateNonInterpolatedFixes();
        this._initWaypointHeadings(); // these headings are used by ._insertCurrentPosition()
        this._insertCurrentPosition(aircraftPosition); // always do this BEFORE interpolated waypoints

        if (this._waypoints.length < 2) { // if only waypoint is the current position, below is not needed
            return;
        }

        this._insertSectorBoundaryWaypoints(organizationCollection);
        // if you want to add any `Waypoint`s, do so here, BEFORE calculating the distances (else they'll be wrong)
        this._initWaypointDistances(); // calculate distances now that additional waypoints have been added
        this._initWaypointTimes(); // calculate time estimates over all fixes (including prior ones)
    }

    /**
     * Populate `Waypoint.distanceFromPreviousWaypoint` data for each `Waypoint` in this `Route`
     *
     * @for Route
     * @method _initWaypointDistances
     * @returns {undefined}
     * @private
     */
    _initWaypointDistances() {
        if (this._waypoints.length === 0) {
            return;
        }

        this._waypoints[0].distanceFromPreviousWaypoint = 0; // distance from the origin to the first waypoint is... none miles

        for (let i = 1; i < this._waypoints.length; i++) { // skip the first one since it has no "previous" waypoint
            const previousWaypoint = this._waypoints[i - 1];
            const waypoint = this._waypoints[i];
            const distanceKm = distance(previousWaypoint.turfPoint, waypoint.turfPoint);
            const distanceNm = convertLength(distanceKm, TURF_LENGTH_UNIT.KILOMETERS, TURF_LENGTH_UNIT.NAUTICAL_MILES);
            waypoint.distanceFromPreviousWaypoint = distanceNm;
        }
    }

    /**
     * Populate `Waypoint.headingToNextWaypoint` data for each `Waypoint` in this `Route`
     *
     * @for Route
     * @method _initWaypointHeadings
     * @returns {undefined}
     * @private
     */
    _initWaypointHeadings() {
        if (this._waypoints.length === 0) {
            return;
        }

        for (let i = 0; i < this._waypoints.length - 1; i++) { // do all but the last one (which is done after the for loop)
            const previousWaypoint = this._waypoints[i];
            const nextWaypoint = this._waypoints[i + 1];
            const headingFromPrevious = bearingToAzimuth(bearing(previousWaypoint.turfPoint, nextWaypoint.turfPoint));
            previousWaypoint.headingToNextWaypoint = headingFromPrevious;
        }

        if (this._waypoints.length < 2) { // need at least 2 waypoints to determine a heading from wp1-wp2
            return;
        }

        // for the LAST waypoint, call the heading to the "next" (non-existant) waypoint the same as the inbound heading
        const inboundHeading = this._waypoints[this._waypoints.length - 2].headingToNextWaypoint;
        this._waypoints[this._waypoints.length - 1].headingToNextWaypoint = inboundHeading;
    }

    /**
     * Initialize time estimates over each `Waypoint` in the `Route`
     *
     * @for Route
     * @method _initWaypointTimes
     * @returns {undefined}
     * @private
     */
    _initWaypointTimes() {
        if (this._waypoints.length === 0) {
            return;
        }

        const currentWaypointIndex = this._getCurrentWaypointIndex();

        // set data's update time as the time the aircraft is at its present position
        this._waypoints[currentWaypointIndex].time = this._updateTime;

        // calculate and set times from aircraft's present position BACKWARD to origin
        for (let i = currentWaypointIndex - 1; i > -1; i--) {
            const originSideWaypoint = this._waypoints[i];
            const destSideWaypoint = this._waypoints[i + 1];
            const distance = distanceNm(destSideWaypoint.turfPoint, originSideWaypoint.turfPoint);
            const groundSpeed = this._groundSpeedOfAircraft > 0 ? this._groundSpeedOfAircraft : 0.001;
            const travelTimeMs = distance / groundSpeed * TIME.ONE_HOUR_IN_MILLISECONDS;
            const timeAtOriginSideWaypoint = new Date(destSideWaypoint.time.getTime() - travelTimeMs);
            originSideWaypoint.time = timeAtOriginSideWaypoint;
        }

        // calculate and set times from aircraft's present position FORWARD to destination
        for (let i = currentWaypointIndex + 1; i < this._waypoints.length; i++) {
            const originSideWaypoint = this._waypoints[i - 1];
            const destSideWaypoint = this._waypoints[i];
            const distance = distanceNm(originSideWaypoint.turfPoint, destSideWaypoint.turfPoint);
            const groundSpeed = this._groundSpeedOfAircraft > 0 ? this._groundSpeedOfAircraft : 0.001;
            const travelTimeMs = distance / groundSpeed * TIME.ONE_HOUR_IN_MILLISECONDS;
            const timeAtDestSideWaypoint = new Date(originSideWaypoint.time.getTime() + travelTimeMs);
            destSideWaypoint.time = timeAtDestSideWaypoint;
        }
    }

    /* ----------------------------- PUBLIC ----------------------------- */

    /**
     * Return the cumulative total distance along the `Route`, from first to last `Waypoint`
     *
     * @for Route
     * @method getFullRouteLength
     * @returns {number} - distance, in nautical miles
     */
    getFullRouteLength() {
        const totalDistance = this._waypoints.reduce((totalDistance, wp) => {
            return totalDistance + wp.distanceFromPreviousWaypoint;
        }, 0);

        return Math.round(totalDistance);
    }

    /**
     * Return an array of all `Waypoint`s in this `Route` which mark an entry or exit of a `Sector`
     *
     * @for Route
     * @method getWaypointsWithSectorChanges
     * @returns {array<Waypoint>}
     */
    getWaypointsWithSectorChanges() {
        return this._waypoints.filter((wp) => wp.sectorChange.enter.length > 0 || wp.sectorChange.exit.length > 0);
    }

    /* ----------------------------- PRIVATE ----------------------------- */

    /**
     * Read the `Waypoint.sectorBoundaries` data and apply the appropriate content to `Waypoint.sectorChange`
     *
     * @for Route
     * @method _generateSectorEntryExitData
     * @param organizationCollection {OrganizationCollection}
     * @returns {undefined}
     * @private
     */
    _generateSectorEntryExitData(organizationCollection) {
        if (this._waypoints.length === 0) {
            return;
        }

        const sectorsRouteStartsWithin = organizationCollection.getSectorsFromTurfPoint(this._waypoints[0].turfPoint);

        // if first waypoint is inside a sector, mark that waypoint as "entering" that sector
        if (sectorsRouteStartsWithin.length > 0) {
            this._waypoints[0].sectorChange.enter.push(...sectorsRouteStartsWithin);
        }

        // first wp will never be a sector-entry wp because they are interpolated
        for (let i = 1; i < this._waypoints.length; i++) {
            const waypoint = this._waypoints[i];

            // for aircraft landing at their destination (must be an airport, not a fix)
            if (i === this._waypoints.length - 1) {
                if (waypoint.isAirport()) {
                    const unexitedSectors = this._getUnexitedSectors();

                    waypoint.sectorChange.exit.push(...unexitedSectors);
                }
            }

            if (waypoint.sectorBoundaryPolygons.length === 0) {
                continue;
            }

            const previousWaypointCoords = this._waypoints[i - 1].turfPoint.geometry.coordinates;
            const currentWaypointCoords = this._waypoints[i].turfPoint.geometry.coordinates;
            const legMidpointCoords = [
                (previousWaypointCoords[0] + currentWaypointCoords[0]) / 2,
                (previousWaypointCoords[1] + currentWaypointCoords[1]) / 2
            ];

            for (let j = 0; j < waypoint.sectorBoundaryPolygons.length; j++) {
                const poly = waypoint.sectorBoundaryPolygons[j];
                const isExitingPoly = booleanPointInPolygon(legMidpointCoords, poly);

                if (isExitingPoly) { // Waypoint marks the position the aircraft LEAVES the sector
                    waypoint.sectorChange.exit.push(poly.properties.sector);
                } else { // Waypoint marks the position the aircraft ENTERS the sector
                    waypoint.sectorChange.enter.push(poly.properties.sector);
                }
            }
        }
    }

    /**
     * Return the index of the waypoint representing the aircraft's CURRENT POSITION
     *
     * @for Route
     * @method _getCurrentWaypointIndex
     * @returns {number}
     * @private
     */
    _getCurrentWaypointIndex() {
        return this._waypoints.findIndex((wp) => wp.isAircraftPosition());
    }

    /**
     * Return an array of all space-separated elements of a flightplan, regardless of their type/content
     *
     * @for Route
     * @method _getElementsFromRouteString
     * @returns {array<string>} - array of strings; the strings will be fixes, airways, procedures, etc
     * @private
     */
    _getElementsFromRouteString() {
        const elements = this._routeString.split(' ');
        const trimmedElements = elements.filter((element) => element !== '');

        return trimmedElements;
    }

    /**
     * Return an array of fixes in the flightplan for which we know has a defined location in nav data
     * NOTE: This will IGNORE any fixes specified in `FIXES_TO_IGNORE`
     *
     * @for Route
     * @method _getFixesFromRouteString
     * @returns {array} - array of fixes
     * @private
     */
    _getFixesFromRouteString() {
        const routeElements = this._getElementsFromRouteString();
        const waypoints = [];

        if (typeof routeElements === 'undefined') {
            return waypoints;
        }

        for (const element of routeElements) {
            if (FIXES_TO_IGNORE.includes(element)) {
                continue;
            }

            if (element in ROUTES_TO_REPLACE) {
                const fixes = ROUTES_TO_REPLACE[element];

                for (const fix of fixes) {
                    const position = NavigationLibrary.getFixWithName(fix);

                    if (typeof position === 'undefined') {
                        continue;
                    }

                    waypoints.push(position);
                }
            }

            const position = NavigationLibrary.getFixWithName(element);

            if (typeof position === 'undefined') {
                continue;
            }

            waypoints.push(position);
        }

        return waypoints;
    }

    /**
     * Return an array of `Sector`s this route has entered but never exited
     *
     * @for Route
     * @method _getUnexitedSectors
     * @returns {array<Sector>}
     * @private
     */
    _getUnexitedSectors() {
        const sectors = [];

        // add sectors entered
        for (const waypoint of this._waypoints) {
            if (waypoint.sectorChange.enter.length > 0) {
                sectors.push(...waypoint.sectorChange.enter);
            }
        }

        // remove sectors exited
        for (const waypoint of this._waypoints) {
            if (waypoint.sectorChange.exit.length > 0) {
                const sectorsExited = waypoint.sectorChange.exit;
                const indexList = sectorsExited.map((sector) => sectors.indexOf(sector));

                for (const i of indexList) {
                    sectors.splice(i, 1);
                }
            }
        }

        // return sectors entered but not exited
        return sectors;
    }

    /**
     * Insert the provided aircraft current position as a waypoint at the appropriate position within the waypoint list
     *
     * @for Route
     * @method _insertCurrentPosition
     * @param {object} aircraftPosition - { lat: 40, lon: -77 }
     * @returns {undefined}
     * @private
     */
    _insertCurrentPosition(aircraftPosition) {
        const isAircraftPosition = true;
        const aircraftPositionWaypoint = new Waypoint(aircraftPosition, isAircraftPosition);

        this._insertWaypoint(aircraftPositionWaypoint);
    }

    /**
     * Insert the provided waypoint into the `Route` at the appropriate position
     *
     * @for Route
     * @method _insertWaypoint
     * @param {Waypoint} proposedWaypoint
     * @returns {undefined}
     * @private
     */
    _insertWaypoint(proposedWaypoint) {
        // this._updateTurfLineStringFromWaypoints();

        if (this._waypoints.length === 0) {
            this._waypoints.push(proposedWaypoint);

            return;
        }

        // if (!proposedWaypoint.isAircraftPosition()) {
        //     // start at second element and see if `proposedWaypoint` belongs between that and THE PREVIOUS element
        //     for (let i = 1; i < this._waypoints.length; i++) {
        //         const waypoint = this._waypoints[i];
        //         const previousWaypoint = this._waypoints[i - 1];
        //         const lineSegment = lineString(previousWaypoint.coordinatesLonLat, waypoint.coordinatesLonLat);
        //         // const isWaypointInThisSegment = booleanPointOnLine(proposedWaypoint.coordinatesLonLat, lineSegment);
        //         const bearingFromPrevious = bearing360(previousWaypoint.turfPoint, waypoint.turfPoint);
        //         const bearingFromProposed = bearing360(proposedWaypoint.turfPoint, waypoint.turfPoint);
        //         const angularDifference = calculateAngleDifference(bearingFromPrevious, bearingFromProposed);

        //         if (Math.abs(angularDifference) < MAX_ANGLE_DIFFERENCE_TO_CONSIDER_ROUTE_ALIGNED_DEG) {
        //             this._waypoints.splice(i, 0, proposedWaypoint);

        //             return;
        //         }

        //         if (i === this._waypoints.length - 1) { // if the provided waypoint is aligned with any portion of the route
        //             throw new TypeError('Expected the provided waypoint to be aligned with the route, ' +
        //                 'but it is not aligned correctly!');
        //         }
        //     }
        // }

        let insertionIndex = 0;
        const waypointInfo = this._waypoints.map((waypoint) => {
            const distanceFromProposedWaypoint = distanceNm(proposedWaypoint.turfPoint, waypoint.turfPoint);

            if (proposedWaypoint.isCollocatedWithWaypoint(waypoint)) {
                // here we must override the calculated bearing, since the bearing from a position to the same
                // position will be 0. This can cause later logic to think the proposed waypoint should go after
                // `waypoint` because it finds the turn to be too sharp, when there really is no turn at all.
                return { distance: distanceFromProposedWaypoint, turnOverFix: 0 };
            }

            const bearingFromProposedWaypoint = bearing(proposedWaypoint.turfPoint, waypoint.turfPoint);
            const angularDifference = calculateAngleDifference(waypoint.headingToNextWaypoint, bearingFromProposedWaypoint);

            return { distance: distanceFromProposedWaypoint, turnOverFix: angularDifference };
        });
        const distances = waypointInfo.map((wp) => wp.distance);
        const indexOfClosestWaypoint = distances.indexOf(Math.min.apply(null, distances));

        for (let i = indexOfClosestWaypoint; i < waypointInfo.length; i++) {
            if (i === waypointInfo.length - 1) { // if last waypoint is the closest waypoint
                if (proposedWaypoint.isAircraftPosition() && this._waypoints.length >= 2) {
                    // if total route heading aligns with heading OUT of last fix TO aircraft,
                    // then we know the aircraft has PASSED their last fix and no further trajectory
                    // is known-- probably due to a lack of nav data coverage. We will "project" the
                    // aircraft to remain at its current position, which will update over time, but
                    // we cannot truly "predict" where it will go without better nav data coverage.
                    const totalHeading = bearing(this._waypoints[0].turfPoint, this._waypoints[i].turfPoint);
                    const headingFromLastToAircraft = bearing(this._waypoints[i].turfPoint, proposedWaypoint.turfPoint);
                    const angDifference = calculateAngleDifference(headingFromLastToAircraft, totalHeading);

                    if (Math.abs(angDifference) < MAX_TURN_ANGLE_BEFORE_SKIPPING_FIX_DEG) {
                        insertionIndex = i + 1; // as new last waypoint

                        break;
                    }
                }

                insertionIndex = i;

                break;
            }

            if (Math.abs(waypointInfo[i].turnOverFix) < MAX_TURN_ANGLE_BEFORE_SKIPPING_FIX_DEG) {
                insertionIndex = i;

                break;
            }
        }

        // set the .headingToNextWaypoint
        if (insertionIndex === this._waypoints.length && this._waypoints.length > 0) { // if inserting as the new last waypoint
            const previouseWaypoint = this._waypoints[insertionIndex - 1];
            const headingFromPreviousWaypoint = bearing360(previouseWaypoint.turfPoint, proposedWaypoint.turfPoint);
            proposedWaypoint.headingToNextWaypoint = headingFromPreviousWaypoint;
        } else {
            const nextWaypoint = this._waypoints[insertionIndex];
            const headingToNextWaypoint = bearing360(proposedWaypoint.turfPoint, nextWaypoint.turfPoint);
            proposedWaypoint.headingToNextWaypoint = headingToNextWaypoint;
        }

        // insert the current position waypoint at the appropriate position
        this._waypoints.splice(insertionIndex, 0, proposedWaypoint);
    }

    /**
     * Insert each of the `Waypoint`s in the provided array into the `Route` at the appropriate position
     *
     * @for Route
     * @method _insertWaypoints
     * @param {array<Waypoint>} waypoints
     * @returns {undefined}
     * @private
     */
    _insertWaypoints(waypoints) {
        for (const waypoint of waypoints) {
            this._insertWaypoint(waypoint);
        }
    }

    /**
     * Iterate through each waypoint-to-waypoint leg of the route, checking each leg for point(s) where
     * the route crosses a sector boundary, and adding waypoints at those locations with information
     * stored in that waypoint which describes the sector which was being entered/exited
     *
     * @for Route
     * @method _insertSectorBoundaryWaypoints
     * @param {OrganizationCollection} organizationCollection
     * @returns {undefined}
     * @private
     */
    _insertSectorBoundaryWaypoints(organizationCollection) {
        this._updateTurfLineStringFromWaypoints();

        for (let i = 0; i < this._waypoints.length - 1; i++) {
            const waypoint = this._waypoints[i];
            const nextWaypoint = this._waypoints[i + 1];
            const turfLineString = lineString([waypoint.coordinatesLonLat, nextWaypoint.coordinatesLonLat]);
            const boundaryWaypoints = organizationCollection.getSectorBoundaryCrossingWaypoints(turfLineString);

            if (boundaryWaypoints.length === 0) {
                continue;
            }

            boundaryWaypoints.sort((wpA, wpB) => {
                const distanceToWpA = distance(waypoint.turfPoint, wpA.turfPoint);
                const distanceToWpB = distance(waypoint.turfPoint, wpB.turfPoint);

                return distanceToWpA - distanceToWpB;
            });

            // combine back-to-back waypoints for exiting one sector and entering another at the same location
            for (let j = 0; j < boundaryWaypoints.length - 1; j++) {
                const thisIndexWp = boundaryWaypoints[j];
                const nextIndexWp = boundaryWaypoints[j + 1];

                if (thisIndexWp.isCollocatedWithWaypoint(nextIndexWp)) { // if collocated, merge waypoint sector poly data
                    thisIndexWp.sectorBoundaryPolygons.push(...nextIndexWp.sectorBoundaryPolygons);
                    boundaryWaypoints.splice(j + 1, 1);
                }
            }

            this._waypoints.splice(i + 1, 0, ...boundaryWaypoints);

            i += boundaryWaypoints.length;
        }

        this._generateSectorEntryExitData(organizationCollection);
    }

    /**
     * Remove any `Waypoint`s from `this._waypoints` whose `icao` properties are identical, skipping interpolated fixes
     * Priority of survival is given to `Airport` elements over `Fix` elements.
     *
     * This is useful for ignoring when people put their origin
     * airport in the origin field AND as the first route element:
     *     KMIA KMIA HEDLY2 HEDLY PHK BAIRN4 KMCO KMCO
     *  --->    KMIA HEDLY2 HEDLY PHK BAIRN4 KMCO
     *
     * @for Route
     * @method _removeDuplicateNonInterpolatedFixes
     * @returns {undefined}
     * @private
     */
    _removeDuplicateNonInterpolatedFixes() {
        // iterate from first waypoint to second-to-last waypoint, comparing each with the NEXT
        for (let i = 0; i < this._waypoints.length - 1; i++) {
            const waypoint = this._waypoints[i];
            const nextWaypoint = this._waypoints[i + 1];

            // theoretically, there shouldn't even be any GPS waypoints yet; keeping anyway for defensiveness
            if (waypoint.isGps() || nextWaypoint.isGps()) { // if either waypoint is a GPS waypoint
                continue;
            }

            if (waypoint.icao !== nextWaypoint.icao) { // if both have ICAO identifiers, and they are different
                continue;
            }

            if (waypoint.isAirport()) { // if the current waypoint is an airport
                this._waypoints.splice(i + 1, 1); // remove the next waypoint

                continue;
            }

            if (nextWaypoint.isAirport()) { // if the next waypoint is an airport
                this._waypoints.splice(i, 1); // remove the current waypoint

                continue;
            }

            this._waypoints.splice(i + 1, 1); // if neither is an airport, remove the next waypoint
        }
    }

    /**
     * Regenerate the `_turfLineString` from all `Waypoint`s in the `Route`
     *
     * For example, we would want to do this after adding a series of interpolated waypoints, so
     * that the route points displayed in the situation display can offer contextual information on
     * each position along the aircraft's route which could be relevant to the user
     *
     * @for Route
     * @method _updateTurfLineStringFromWaypoints
     * @returns {undefined}
     * @private
     */
    _updateTurfLineStringFromWaypoints() {
        if (this._waypoints.length < 2) {
            console.warn('Expected multiple waypoints to be recognized, but the route has only ' +
                `${this._waypoints.length} known positions!`);

            return;
        }

        const coordinates = this._waypoints.map((wp) => wp.turfPoint.geometry.coordinates);
        this._turfLineString = lineString(coordinates, { routeString: this._routeString });
    }
}
