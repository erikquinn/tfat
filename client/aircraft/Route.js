import { lineString, convertLength, bearingToAzimuth } from '@turf/helpers';
import bearing from '@turf/bearing';
import distance from '@turf/distance';
import NavigationLibrary from '../navData/NavigationLibrary.js';
import Waypoint from './Waypoint.js';
import { TURF_LENGTH_UNIT } from '../constants/turfConstants.js';
import { calculateAngleDifference, distanceNm } from '../clientUtilities.js';
import { MAX_TURN_ANGLE_BEFORE_SKIPPING_FIX_DEG } from '../constants/routeConstants.js';

export default class Route {
    constructor(data) {
        this._origin = data.origin;
        this._destination = data.destination;
        this._routeString = data.routeString;
        this._turfLineString = null;
        this._waypoints = [];

        this._init(data);
    }

    /**
     * The Turf.js `LineString` instance associated with this waypoint's geographic location
     *
     * @for Route
     * @property turfLineString
     * @type {LineString}
     */
    get turfLineString() {
        return this._turfLineString;
    }

    _init(data) {
        this._initWaypoints(data);
        this._initTurfLineString();
    }

    _initTurfLineString() {
        if (this._waypoints.length < 2) {
            console.warn('Expected multiple waypoints to be recognized, but the route has only ' +
                `${this._waypoints.length} known positions!`);

            return;
        }

        const turfPoints = this._waypoints.map((wp) => wp.turfPoint);
        this._turfLineString = lineString(turfPoints, { routeString: this._routeString });
    }

    _initWaypoints({ aircraftPosition }) {
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

        this._initWaypointHeadings();
        this._initWaypointDistances();
        this._insertCurrentPosition(aircraftPosition);
    }

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

        // for the LAST waypoint, call the heading to the "next" (non-existant) waypoint the same as the inbound heading
        this._waypoints[this._waypoints.length - 1].headingToNextWaypoint = this._waypoints[this._waypoints.length - 2];
    }

    /**
     * Insert the provided aircraft current position as a waypoint at the appropriate position within the waypoint list
     *
     * @for Route
     * @method _insertCurrentPosition
     * @param {object} aircraftPosition - { lat: 40, lon: -77 }
     * @returns undefined
     * @private
     */
    _insertCurrentPosition(aircraftPosition) {
        const aircraftPositionWaypoint = new Waypoint(aircraftPosition);

        if (this._waypoints.length === 0) {
            this._waypoints.push(aircraftPositionWaypoint);

            return;
        }

        let insertAircraftBeforeIndex = 0;
        const waypointInfo = this._waypoints.map((waypoint) => {
            const distanceFromAircraftToWaypoint = distanceNm(aircraftPositionWaypoint.turfPoint, waypoint.turfPoint);
            const bearingFromAircraftToWaypoint = bearing(aircraftPositionWaypoint.turfPoint, waypoint.turfPoint);
            const angularDifference = calculateAngleDifference(waypoint.headingToNextWaypoint, bearingFromAircraftToWaypoint);

            return { distance: distanceFromAircraftToWaypoint, turnOverFix: angularDifference };
        });
        const distances = waypointInfo.map((wp) => wp.distance);
        const indexOfClosestWaypoint = distances.indexOf(Math.min.apply(null, distances));

        for (let i = indexOfClosestWaypoint; i < waypointInfo.length; i++) {
            if (Math.abs(waypointInfo[i].turnOverFix) < MAX_TURN_ANGLE_BEFORE_SKIPPING_FIX_DEG) {
                insertAircraftBeforeIndex = i;

                break;
            }
        }

        this._waypoints.splice(insertAircraftBeforeIndex, 0, aircraftPositionWaypoint);

        // for (const waypoint of this._waypoints) {
        //     // const aircraftPositionTurfPoint = point(aircraftPosition,)
        //     const bearingFromAircraftToWaypoint = bearing(aircraftPositionWaypoint.turfPoint, waypoint.turfPoint);
        //     const angularDifference = calculateAngleDifference(waypoint.headingToNextWaypoint, bearingFromAircraftToWaypoint);

        //     // if (Math.abs(angularDifference) < MAX_TURN_ANGLE_BEFORE_SKIPPING_FIX_DEG) {
        //     // }

        //     distanceFromWaypoints.push()
        // }
    }

    /**
     * Return an array of fixes in the flightplan for which we know has a defined location in nav data
     *
     * @for Route
     * @method _getFixesFromRouteString
     * @returns {array} - array of fixes
     * @private
     */
    _getFixesFromRouteString() {
        const routeElements = this._getElementsFromRouteString();
        const waypoints = [];

        for (const element of routeElements) {
            const position = NavigationLibrary.getFixWithName(element);

            if (typeof position === 'undefined') {
                continue;
            }

            waypoints.push(position);
        }

        return waypoints;
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

    getFullRouteLength() {
        const totalDistance = this._waypoints.reduce((totalDistance, wp) => {
            return totalDistance + wp.distanceFromPreviousWaypoint;
        }, 0);

        return Math.round(totalDistance);
    }
}
