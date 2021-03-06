export const ZDC = {
    organizationName: 'Washington ARTCC',
    keyAirports: ['KDCA', 'KBWI', 'KIAD', 'KRIC', 'KRDU', 'KFAY', 'KILM', 'KORF', 'KACY', 'KDOV', 'KROA', 'KADW'],
    airportGroups: {
        MTV: ['KDCA'],
        CHP: ['KBWI'],
        SHD: ['KIAD'],
        JRV: ['KRIC'],
        RDU: ['KRDU'],
        FAY: ['KFAY'],
        ILM: ['KILM'],
        ORF: ['KORF'],
        ACY: ['KACY'],
        DOV: ['KDOV'],
        ROA: ['KROA'],
        get PCT() {
            return [...this.MTV, ...this.CHP, ...this.SHD, ...this.JRV];
        },
        get ZDC() {
            return [...this.PCT, ...this.MTV, ...this.CHP, ...this.SHD, ...this.JRV, ...this.RDU, ...this.FAY, ...this.ILM, ...this.ORF, ...this.ACY, ...this.DOV, ...this.ROA];
        }
    },
    facilities: {
        center: {
            airspaceExclusionFacilities: [],
            facilityName: 'Washington Center',
            defaultSectorConfiguration: {
                32: 32
            },
            sectors: {
                32: [
                    {
                        altitudes: [0, Infinity],
                        notes: '',
                        coordinates: [
                            [38.56944444, -80.61263889],
                            [38.7, -80],
                            [38.7, -79.63333333],
                            [39.05, -79.42097222],
                            [39.14166667, -79.375],
                            [39.3, -79.27222222],
                            [39.46666667, -79.23333333],
                            [39.33472222, -78.70277778],
                            [39.43333333, -78.62777778],
                            [39.59166667, -78.52222222],
                            [39.64666667, -78.48516667],
                            [39.70555556, -78.44444444],
                            [39.77222222, -78.2],
                            [39.85, -77.93333333],
                            [39.85555556, -77.84041667],
                            [39.86161667, -77.71049444],
                            [39.86723889, -77.57775833],
                            [39.87027778, -77.51016667],
                            [39.87138889, -77.44227778],
                            [39.875, -77.35522222],
                            [39.88, -77.15833333],
                            [39.8825, -77.03825],
                            [39.88361111, -76.97561111],
                            [39.87666667, -76.96975],
                            [39.85305556, -76.94444444],
                            [39.83805556, -76.90986111],
                            [39.83416667, -76.86941667],
                            [39.84055556, -76.83147222],
                            [39.85805556, -76.79813889],
                            [39.88416667, -76.775],
                            [39.88472222, -76.53333333],
                            [39.85888889, -76.40213889],
                            [39.82027778, -76.21141667],
                            [39.68916667, -75.89475],
                            [39.56333333, -75.97222222],
                            [39.55777778, -76.01355556],
                            [39.335, -75.87005556],
                            [39.26666667, -75.83611111],
                            [39.31805556, -75.60833333],
                            [39.34027778, -75.60833333],
                            [39.37166667, -75.45833333],
                            [39.38333333, -75.39597222],
                            [39.43194444, -75.31172222],
                            [39.475, -75.25],
                            [39.48083333, -75.23919444],
                            [39.49472222, -75.21108333],
                            [39.51666667, -75.16666667],
                            [39.54722222, -75.09597222],
                            [39.655, -74.97466667],
                            [39.70972222, -74.91111111],
                            [39.71638889, -74.82252778],
                            [39.72027778, -74.77622222],
                            [39.725, -74.725],
                            [39.65555556, -74.5],
                            [39.71666667, -74.44041667],
                            [39.74722222, -74.41111111],
                            [39.74916667, -74.39444444],
                            [39.74722222, -74.32222222],
                            [39.72361111, -74.29319444],
                            [39.71666667, -74.17222222],
                            [39.66416667, -74.06108333],
                            [39.575, -73.93333333],
                            [39.42833333, -74.04288889],
                            [39.38611111, -73.99905556],
                            [39.31444444, -73.92652778],
                            [39.41527778, -73.76325],
                            [39.73333333, -73.46419444],
                            [39.73333333, -73.28333333],
                            [39.73333333, -73.15],
                            [39.73333333, -72.88363889],
                            [39.33722222, -72.5],
                            [39.09666667, -72.27005556],
                            [38.76666667, -72.5],
                            [38.33333333, -72.8],
                            [38.28333333, -72.83394444],
                            [38.7375, -73.86111111],
                            [38.54166667, -73.98333333],
                            [37.08166667, -74.59997222],
                            [37.09358611, -74.45616667],
                            [37.2275, -72.66666667],
                            [36.7025, -72.66633333],
                            [36.78383611, -74.49165833],
                            [36.78777778, -74.59997222],
                            [35.49694444, -74.93702778],
                            [34.48805556, -73.57313889],
                            [34.36277778, -73.75183333],
                            [34.23333333, -73.95],
                            [35.30805556, -75.19011111],
                            [34.60027778, -75.68394444],
                            [33.41916667, -76.48116667],
                            [32.96777778, -76.77961111],
                            [33.28861111, -77.19844444],
                            [33.52555556, -77.51172222],
                            [33.70555556, -77.75091667],
                            [33.84166667, -77.933],
                            [33.84166667, -78.09997222],
                            [33.84194444, -78.14997222],
                            [33.84194444, -78.39566667],
                            [34.15722222, -78.35833333],
                            [34.39694444, -78.68516667],
                            [34.44444444, -78.75],
                            [34.43416667, -79.06666667],
                            [34.4275, -79.26355556],
                            [34.425, -79.33333333],
                            [34.71333333, -79.72808333],
                            [34.85, -79.91666667],
                            [34.85555556, -80.14722222],
                            [35.10833333, -80],
                            [35.3, -80],
                            [35.38333333, -79.80430556],
                            [35.42611111, -79.579],
                            [35.70416667, -79.49166667],
                            [36.24166667, -79.32283333],
                            [36.29083333, -79.47219444],
                            [36.3775, -79.56541667],
                            [36.69694444, -79.92097222],
                            [36.79277778, -80.07097222],
                            [36.68472222, -80.25955556],
                            [36.80833333, -80.32375],
                            [36.61388889, -80.65833333],
                            [36.71666667, -80.99166667],
                            [36.95416667, -81.09597222],
                            [37.21111111, -81.16263889],
                            [37.27083333, -80.9],
                            [37.43333333, -80.82222222],
                            [37.46666667, -80.84166667],
                            [37.52916667, -80.825],
                            [37.70833333, -80.7895],
                            [38.04166667, -80.71666667],
                            [38.3825, -80.64475]
                        ]
                    }
                ]
            }
        }
    }
};
