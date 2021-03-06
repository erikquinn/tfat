export const ZFW = {
    organizationName: 'Fort Worth ARTCC',
    keyAirports: ['KTXK', 'KBAD', 'KMLU', 'KSHV', 'KOKC', 'KABI', 'KADS', 'KDFW', 'KDAL', 'KFTW', 'KAFW', 'KACT'],
    airportGroups: {
        D10: ['KDFW', 'KDAL'],
        get ZFW() {
            return [...this.D10];
        }
    },
    facilities: {
        center: {
            airspaceExclusionFacilities: [],
            facilityName: 'Fort Worth Center',
            defaultSectorConfiguration: {
                1: 1
            },
            sectors: {
                1: [
                    {
                        altitudes: [0, Infinity],
                        notes: '',
                        coordinates: [
                            [32.19166667, -92.86263889],
                            [31.8, -93.79597222],
                            [31.57, -93.8435],
                            [31.57222222, -94.2],
                            [31.56111111, -94.54722222],
                            [31.54583333, -94.60833333],
                            [31.80833333, -94.60833333],
                            [31.80833333, -94.875],
                            [31.53333333, -94.875],
                            [31.5, -95.29166667],
                            [31.4875, -95.62930556],
                            [31.46666667, -95.98333333],
                            [31.35833333, -96.26666667],
                            [31.26666667, -96.51263889],
                            [31.20416667, -96.68333333],
                            [31.20416667, -97],
                            [30.875, -97.04166667],
                            [30.8, -97.1],
                            [30.8, -97.63672222],
                            [30.8, -97.67252778],
                            [30.8, -98.08333333],
                            [31.3875, -98.55833333],
                            [31.38333333, -99.46666667],
                            [31.25, -99.83333333],
                            [31.16666667, -99.85],
                            [31.03333333, -99.91666667],
                            [30.98333333, -99.95],
                            [30.85, -100.1333333],
                            [30.775, -100.35],
                            [30.76666667, -100.6],
                            [30.83333333, -100.8333333],
                            [30.98333333, -101.0166667],
                            [31.0875, -101.0833333],
                            [31.28333333, -102.15],
                            [31.37083333, -102.4333333],
                            [31.58333333, -103.1166667],
                            [31.65, -103.3333333],
                            [31.80833333, -103.5293056],
                            [32.03333333, -103.8],
                            [32.46666667, -103.9333333],
                            [32.84583333, -103.8404167],
                            [33, -103.8],
                            [33.05, -103.8],
                            [33.38333333, -103.8],
                            [33.40277778, -103.6916667],
                            [33.6375, -103.4876389],
                            [33.71944444, -103.4083333],
                            [33.775, -103.3666667],
                            [34.31666667, -102.8],
                            [34.38888889, -102.6626389],
                            [34.55, -102.325],
                            [34.6, -102],
                            [34.49166667, -101],
                            [34.46666667, -100.75],
                            [34.86666667, -100.3166667],
                            [35.12916667, -100.1416667],
                            [35.25, -100.0611111],
                            [35.33333333, -100],
                            [35.82916667, -100],
                            [35.83333333, -99.38363889],
                            [35.81666667, -99.22777778],
                            [35.81666667, -98.8],
                            [35.81666667, -98.5],
                            [35.81666667, -98.46666667],
                            [35.8625, -98.14844444],
                            [35.88333333, -98.01666667],
                            [35.925, -97.88333333],
                            [35.97444444, -97.74722222],
                            [36.03333333, -97.58363889],
                            [35.845, -97.26388889],
                            [35.7375, -96.91263889],
                            [35.62222222, -96.8395],
                            [35.52777778, -96.83919444],
                            [35.65, -96.40430556],
                            [35.75, -96.23333333],
                            [35.62777778, -96.12930556],
                            [35.50833333, -96.14597222],
                            [35.475, -95.81666667],
                            [35.5875, -95.79597222],
                            [35.58333333, -95.72097222],
                            [35.87083333, -95.36666667],
                            [35.65416667, -95],
                            [35.38333333, -95],
                            [35.06666667, -95],
                            [34.93333333, -94.925],
                            [34.75555556, -94.81666667],
                            [34.69166667, -94.78333333],
                            [34.53333333, -94.53333333],
                            [34.26666667, -94],
                            [34.08888889, -93.65833333],
                            [34.03333333, -93.54166667],
                            [33.95, -93.15833333],
                            [33.825, -92.99166667],
                            [33.76666667, -92.91666667],
                            [33.9, -92.7],
                            [33.86666667, -92.51666667],
                            [33.48333333, -92.53333333],
                            [33.00416667, -91.9],
                            [32.86666667, -91.60833333],
                            [32.75277778, -91.51666667],
                            [32.65, -91.43333333],
                            [32.37916667, -91.43333333],
                            [32.15, -91.55],
                            [31.98333333, -91.91666667],
                            [31.95, -92.25],
                            [32.10833333, -92.52222222]
                        ]
                    }
                ]
            }
        }
    }
};
