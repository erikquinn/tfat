import distance from '@turf/distance';
import { convertLength } from '@turf/helpers';
import { TURF_LENGTH_UNIT } from './constants/turfConstants.js';
import bearing from '@turf/bearing';

/**
 * Modulus function
 *
 * Returns a POSITIVE value representing the remainder of dividing `firstValue` by `secondValue`
 * This is useful for constraining angles within [0, 360] or [0, 180] ranges
 *
 * mod(100, 180);  // 100
 * mod(200, 180);  // 20
 * mod(-100, 180); // 80 (because -100 is really 260 degrees; 260-180 --> 80)
 * mod(-999, 180); // 81 (because -999 is really 81 degrees, which is ALREADY within [0, 180])
 *
 * @function mod
 * @param firstValue {number} - value to be divided
 * @param secondValue {number} - value to divide by
 * @returns {number}
 */
export function mod(firstValue, secondValue) {
    return ((firstValue % secondValue) + secondValue) % secondValue;
}

/**
 * Returns the smallest angular difference between two headings
 *
 * Angles that wrap around from 350 to +010 (for example) are handled correctly here (20 deg, not 340 deg)
 *
 * @function calculateAngleDifference
 * @param {number} finalAngle - heading, in degrees, to subtract from, within range [0, 360]
 * @param {number} initialAngle - heading, in degrees, to be subtracted, within range [0, 360]
 * @returns {number} - angle between the two headings, signed to show direction to apply from `initialAngle`, within [-180, 180)
 */
export function calculateAngleDifference(finalAngle, initialAngle) {
    let invert = false;

    if (initialAngle > finalAngle) {
        invert = true;
        const nextB = finalAngle;

        finalAngle = initialAngle;
        initialAngle = nextB;
    }

    let offset = mod(finalAngle - initialAngle, 360);

    if (offset > 180) {
        offset -= 360;
    }

    if (invert) {
        offset *= -1;
    }

    return offset;
}

/**
 * Helper function to call Turf.js's `distance()` function and convert its km output to nautical miles
 *
 * @function distanceNm
 * @param {turf.point} point1
 * @param {turf.point} point2
 * @returns {number} - distance in nautical miles
 */
export function distanceNm(point1, point2) {
    const distanceKilometers = distance(point1, point2);
    const distanceNauticalMiles = convertLength(
        distanceKilometers,
        TURF_LENGTH_UNIT.KILOMETERS,
        TURF_LENGTH_UNIT.NAUTICAL_MILES
    );

    return distanceNauticalMiles;
}

/**
 * Helper function to call Turf.js's `bearing()` function and convert its [-180, 180] output to [0, 360]
 *
 * @function bearing360
 * @param {turf.point} point1
 * @param {turf.point} point2
 * @returns {number} - bearing in decimal degrees between [0, 360]
 */
export function bearing360(point1, point2) {
    const bearing180 = bearing(point1, point2);
    const bearing360 = mod(bearing180, 360);

    return bearing360;
}
