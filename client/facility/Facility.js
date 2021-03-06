import _without from 'lodash/without.js';
import SectorCollection from '../sector/SectorCollection.js';

export default class Facility {
    constructor(id, data) {
        /**
         * An array of strings of facilities considered to own airspace which is
         * substracted from the airspace of this facility.
         *
         * For example, a center should have its boundaries defined ignoring approach
         * control airspace, and then simply say that the center `Facility` exludes
         * each approach control. The airspace polygons will be manipulated accordingly
         * for the center to exclude all specified approach control airspaces.
         *
         * @for Facility
         * @property _airspaceExlusionFacilities
         * @type {array<string>} - array of facility identifiers (case sensitive!)
         * @private
         */
        this._airspaceExlusionFacilities = [];

        /**
         * Configuration of which sectors should be combined to which sectors on startup
         *
         * @for Facility
         * @property _defaultSectorConfiguration
         * @type {object}
         * @private
         */
        this._defaultSectorConfiguration = null;

        /**
         * Written name of the facility (ie 'Miami Center')
         *
         * @for Facility
         * @property _facilityName
         * @type {string}
         */
        this._facilityName = '';

        /**
         * Identifier for the facility, must be unique (ie 'ZMA')
         *
         * @for Facility
         * @property _facilityIdentifier
         * @type {string}
         */
        this._facilityIdentifier = id;

        /**
         * Collection of `Sector`s this facility includes
         *
         * @for Facility
         * @property _sectorCollection
         * @type {SectorCollection}
         */
        this._sectorCollection = null;

        this._init(data);
    }

    get id() {
        return this._facilityIdentifier;
    }

    get name() {
        return this._facilityName;
    }

    _init(data) {
        if (!('sectors' in data)) {
            throw new TypeError(`Expected ${data.facilityName} (${this._facilityIdentifier}) ` +
                'to have a "sectors" property, but none exists!');
        }

        this._airspaceExlusionFacilities = data.airspaceExclusionFacilities;
        this._defaultSectorConfiguration = data.defaultSectorConfiguration;
        this._facilityName = data.facilityName;
        this._sectorCollection = new SectorCollection(this._facilityIdentifier, data.sectors);

        this.combineSectorsToDefaultConfiguration();
    }

    /**
     * Combine all `Sector`s in the `Facility`'s `SectorCollection`
     * as specified in their default sector configuration
     *
     * @for Facility
     * @method combineSectorsToDefaultConfiguration
     * @returns {undefined}
     */
    combineSectorsToDefaultConfiguration() {
        for (const [sectorId, absorbingSectorId] of Object.entries(this._defaultSectorConfiguration)) {
            const sector = this._sectorCollection.getSectorWithId(sectorId);
            const absorbingSector = this._sectorCollection.getSectorWithId(absorbingSectorId);

            if (typeof sector === 'undefined') {
                throw new TypeError(`${this._facilityIdentifier} is using a default sector configuration` +
                    `in which sector ${sectorId} is said to be combined at sector ${absorbingSectorId}, ` +
                    `but sector ${sectorId} is not a defined sector!`);
            }

            if (typeof absorbingSector === 'undefined') {
                throw new TypeError(`${this._facilityIdentifier} is using a default sector configuration` +
                    `in which sector ${sectorId} is said to be combined at sector ${absorbingSectorId}, ` +
                    `but sector ${absorbingSectorId} is not a defined sector!`);
            }

            this.combineSectorTo(sector, absorbingSector);
        }
    }

    /**
     * Mark a sector as being combined at another sector, rather than being open on its own
     *
     * @for Facility
     * @method combineSectorTo
     * @param {Sector} sectorBeingAbsorbed
     * @param {Sector} absorbingSector
     * @returns {undefined}
     */
    combineSectorTo(sectorBeingAbsorbed, absorbingSector) {
        this.decombineSector(sectorBeingAbsorbed);

        if (sectorBeingAbsorbed.id === absorbingSector.id) {
            return;
        }

        absorbingSector.subSectors.push(sectorBeingAbsorbed);
    }

    /**
     * Combine multiple sectors to a single sector at the same time
     *
     * @for Facility
     * @method combineSectorsTo
     * @param {array<Sector>} sectorsBeingAbsorbed
     * @param {Sector} absorbingSector
     * @returns {undefined}
     */
    combineSectorsTo(sectorsBeingAbsorbed, absorbingSector) {
        for (const sector of sectorsBeingAbsorbed) {
            this.combineSectorTo(sector, absorbingSector);
        }
    }

    /**
     * Remove the specified sector from ALL sectors' `Sector.subSectors` arrays
     *
     * @for Facility
     * @method decombineSector
     * @param {Sector} sector
     * @returns {undefined}
     */
    decombineSector(sector) {
        for (const otherSector of this._sectorCollection.sectors) {
            otherSector.subSectors = _without(otherSector.subSectors, sector);
        }
    }

    /**
     * Return an array of `Waypoint`s for each position where the provided
     * Turf.js LineString intersects any polygon of any sector of this facility
     *
     * @for Facility
     * @method getIntersectionsWithTurfLineString
     * @param {turf.lineString} turfLineString
     * @returns {array<Waypoint>}
     */
    getIntersectionsWithTurfLineString(turfLineString) {
        return this._sectorCollection.getIntersectionsWithTurfLineString(turfLineString);
    }

    /**
     * Return an array of `Sector`s who own the airspace the provided Turf.js Point is within
     *
     * @for Facility
     * @method getSectorsFromTurfPoint
     * @param {turf.point} turfPoint
     * @returns {array<Sector>}
     */
    getSectorsFromTurfPoint(turfPoint) {
        return this._sectorCollection.getSectorsFromTurfPoint(turfPoint);
    }

    /**
     * Return all `Sector`s of this facility which are open (ie not a subsector of any other sector)
     *
     * @for Facility
     * @method getAllOpenSectors
     * @returns {array<Sector>}
     */
    getAllOpenSectors() {
        const openSectors = this._sectorCollection.sectors.filter((sector) => {
            return this._sectorCollection.sectors.every((otherSector) => !otherSector.subSectors.includes(sector));
        });

        return openSectors;
    }

    getAllSectors() {
        return this._sectorCollection.sectors;
    }

    /**
     * Update the timetables for all `Sector`s
     *
     * @for Facility
     * @method updateSectorTimeTables
     * @param aircraftCollection {AircraftCollection}
     * @returns {undefined}
     */
    updateSectorTimeTables(aircraftCollection) {
        this._sectorCollection.updateSectorTimeTables(aircraftCollection);
    }
}
