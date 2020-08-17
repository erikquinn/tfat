import Aircraft from './Aircraft.js';
import { DESTINATION_GROUP } from '../constants/clientConstants.js';

export default class AircraftCollection {
    /**
     * Constructor for `AircraftCollection`
     *
     * @for AircraftCollection
     * @constructor
     * @chainable
     */
    constructor() {
        /**
         * An array containing all `Aircraft` received from the VATSIM data download
         *
         * @for AircraftCollection
         * @property _list
         * @type <array<Aircraft>>
         * @default []
         * @private
         */
        this._list = [];

        /**
         * Metadata describing the details of the data last received from the server
         *
         * @for AircraftCollection
         * @property _metaData
         * @type {object}
         * @private
         */
        this._metaData = {
            /**
             * Time the stored pilot data was generated by the VATSIM servers
             *
             * @for AircraftCollection
             * @memberof _metaData
             * @property updateTime
             * @type {number}
             * @private
             */
            updateTime: 0,

            /**
             * Total number of pilot connections in the latest data received from VATSIM
             *
             * @for AircraftCollection
             * @memberof _metaData
             * @property pilotConnections
             * @type {number}
             * @private
             */
            pilotConnections: 0,

            /**
             * Total number of connections (of any type) in the latest data received from VATSIM
             *
             * @for AircraftCollection
             * @memberof _metaData
             * @property totalConnections
             * @type {number}
             * @private
             */
            totalConnections: 0
        };

        return this;
    }

    /**
     * Fill the `AircraftCollection` with `Aircraft` generated from the provided data
     *
     * @for AircraftCollection
     * @method updateCollection
     * @param {array<object>} downloadedData - raw download data from the server (NOT `Aircraft` INSTANCES!)
     * @param {object} metaData - information on the latest download (generated time, connection counts, etc)
     */
    updateCollection({ data: downloadedData, metaData }) {
        if (!Array.isArray(downloadedData) || downloadedData.length === 0) {
            throw new TypeError(`Download data invalid! Received: ${downloadedData}`);
        }

        if (!(typeof metaData === 'object') || !metaData.updateTime) {
            throw new TypeError(`Download metadata invalid! Received: ${metaData}`);
        }

        const nextList = [];

        for (const aircraftData of downloadedData) {
            if (!aircraftData) {
                console.error(`Error reading aircraft data: ${aircraftData}`);

                continue;
            }

            const aircraftModel = new Aircraft(aircraftData);

            nextList.push(aircraftModel);
        }

        this._list = nextList;
        this._metaData = metaData;
    }

    /**
     * Return a new `AircraftCollection` instance from `this`, containing only the `Aircraft` provided
     *
     * @for AircraftCollection
     * @method generateNewCollectionWithAircraft
     * @param {array<Aircraft>} aircraftList - An array of `Aircraft` instances (NOT
     *      VATSIM DATA!) from which to form a new `AircraftCollection`
     * @returns {AircraftCollection}
     */
    generateNewCollectionWithAircraft(aircraftList) {
        const nextAircraftCollection = new AircraftCollection();
        nextAircraftCollection._list = aircraftList;
        nextAircraftCollection._metaData = this._metaData;

        return nextAircraftCollection;
    }

    /**
     * Total number of `Aircraft` in the collection
     *
     * @for AircraftCollection
     * @property totalAircraft
     * @type {number}
     */
    get totalAircraft() {
        return this._list.length;
    }

    /**
     * Public getter for read-only access to `this._metaData.updateTime`
     *
     * @for AircaftCollection
     * @property updateTime
     * @type {number}
     */
    get updateTime() {
        return this._metaData.updateTime;
    }

    /**
     * Return html table body data for the entry for all `Aircraft` in `this` collection
     *
     * @for AircraftCollection
     * @method getTableBodyHTML
     * @return {string} - can be directly used with .innerHtml() to create a table body
     */
    getTableBodyHTML() {
        const tableRows = this._list.map((ac) => ac.getTableRowHtml());
        const tableBody = tableRows.join('');

        return tableBody;
    }

    /**
     * Return an `AircraftCollection` including all `Aircraft` landing at the specified destination
     *
     * @for AircraftCollection
     * @param {string} destination - ICAO identifier of the destination airport to filter by
     * @returns {AircraftCollection}
     */
    filterByDestination(destination) {
        destination = destination.toUpperCase();

        const aircraftList = this._list.filter((ac) => ac.destination === destination);
        const filteredAircraftCollection = this.generateNewCollectionWithAircraft(aircraftList);

        return filteredAircraftCollection;
    }

    /**
     * Return an `AircraftCollection` including all `Aircraft` landing at any
     * destination included within the specified destination group
     *
     * @for AircraftCollection
     * @param {string} destination - name of the destination group to filter by, from `DESTINATION_GROUP`
     * @returns {AircraftCollection}
     */
    filterByDestinationGroup(destinationGroupName) {
        destinationGroupName = destinationGroupName.toUpperCase();

        if (!(destinationGroupName in DESTINATION_GROUP)) {
            console.warn(`Invalid filter group specified: "${destinationGroupName}"`);

            return this;
        }

        const airportList = DESTINATION_GROUP[destinationGroupName];
        const aircraftList = this._list.filter((ac) => airportList.includes(ac.destination));
        const filteredAircraftCollection = this.generateNewCollectionWithAircraft(aircraftList);

        return filteredAircraftCollection;
    }
}