export const ZDV = {
    organizationName: 'Denver ARTCC',
    keyAirports: ['KDEN', 'KCOS'],
    airportGroups: {
        D01: ['KDEN'],
        COS: ['KCOS'],
        get ZDV() {
            return [...this.D01, ...this.COS];
        }
    },
    facilities: {
        center: {
            airspaceExclusionFacilities: [],
            facilityName: 'Denver Center',
            defaultSectorConfiguration: {
                1: 1
            },
            sectors: {
                1: [
                    {
                        altitudes: [0, Infinity],
                        notes: '',
                        coordinates: [
                            [38.2, -109.9833333],
                            [38.52777778, -109.9833333],
                            [38.52083333, -110.1953611],
                            [38.91, -110.0981389],
                            [38.94555556, -109.9833333],
                            [39.21666667, -109.9833333],
                            [39.58333333, -110.3],
                            [39.76388889, -109.8166667],
                            [40, -109.1666667],
                            [40.23333333, -109.15],
                            [40.85, -109.1],
                            [41.36666667, -108.275],
                            [41.5375, -108.0722222],
                            [41.60833333, -108],
                            [42.41666667, -107.05],
                            [42.48333333, -107.0666667],
                            [42.54305556, -107.07375],
                            [42.95, -107.1333333],
                            [43.88333333, -107.2833333],
                            [44.31666667, -106.2666667],
                            [44.76666667, -106.1416667],
                            [45.2375, -106],
                            [45.15, -104.7694444],
                            [45.11666667, -104.25],
                            [44.95833333, -103.1666667],
                            [44.7, -101.4833333],
                            [43.70833333, -101.4083333],
                            [43.28888889, -100.1],
                            [43.13333333, -99.96666667],
                            [42, -99.01666667],
                            [41.71666667, -99.025],
                            [41.075, -99.03333333],
                            [41.08888889, -99.16666667],
                            [40.9, -99.33333333],
                            [40.85, -99.33333333],
                            [40.36666667, -99.28888889],
                            [40.35, -99.05430556],
                            [40.23055556, -99.05555556],
                            [39.98333333, -99.05833333],
                            [39.46666667, -98.8],
                            [39.26666667, -99.21666667],
                            [39.05833333, -99.63055556],
                            [38.74416667, -100.2339444],
                            [38.68238889, -100.3527833],
                            [38.25833333, -101.1583333],
                            [38.21861111, -101.2333333],
                            [37.5, -102.55],
                            [37.1625, -103.6194444],
                            [37.04527778, -104],
                            [36.71666667, -105],
                            [36.71666667, -105.3416667],
                            [36.71666667, -106.0833333],
                            [36.62694444, -106.35],
                            [36.2, -107.4666667],
                            [36.03333333, -108.2166667],
                            [35.85, -109.3166667],
                            [35.7, -110.2333333],
                            [35.76666667, -111.8416667],
                            [36.42083333, -111.5043056],
                            [36.515, -111.5357778],
                            [36.73333333, -111.6083333],
                            [37.005, -111.7185111],
                            [37.4125, -111.8793056],
                            [37.41388889, -111.8959722],
                            [37.7, -111.5],
                            [37.66944444, -111.3583333],
                            [37.65, -111.3138889]
                        ]
                    }
                ]
            }
        }
    }
};
