import express from 'express';
import getPilotData from './getPilotData.js';
import {
    assumedSourceDataUpdateRateMs,
    dataRequestIntervalMs,
    SERVER_PORT
} from './serverConstants.js';
import { EMPTY_VATSIM_DATA } from '../globalConstants.js';
import { startVatsimDataUpdates } from './serverUtilities.js';

const app = express();
let latestPilotData = EMPTY_VATSIM_DATA;

app.get('/getUpdatedData', (req, res) => {
    res.send(latestPilotData);
});

// serve index.html, css, images, scripts all in one instead of using app.get()
app.use(express.static('public'));
app.listen(SERVER_PORT, () => {
    console.log(`Listening on port ${SERVER_PORT}`);
});

/**
 * Ask VATSIM server for fresh traffic data and store in `latestPilotData`
 *
 * @function updateLocalData
 * @returns {Promise} - promise from getPilotData()
 */
function updateLocalData() {
    return getPilotData().then((data) => {
        const existingMetaData = latestPilotData.metaData;
        const nextMetaData = data.metaData;
        if (!data || !nextMetaData.updateTime) {
            console.warn(`Received invalid pilot data from VATSIM: \n${data}`);

            return;
        }

        if (nextMetaData.updateTime === existingMetaData.updateTime) {
            console.log(`${nextMetaData.updateTime} (no change-- discarded)`);

            return data;
        } else if (nextMetaData.updateTime < existingMetaData.updateTime) {
            console.warn('Data hiccup from VATSIM! Fresh data is timestamped OLDER than data we already had! ' +
                `Stored data timestamp: ${existingMetaData.updateTime} | ` +
                `Received data timestamp: ${nextMetaData.updateTime}`);

            return;
        }

        latestPilotData = data;

        console.log(latestPilotData.metaData.updateTime);

        return data;
    }).catch((error) => {
        console.error(error);
    });
}

startVatsimDataUpdates(updateLocalData, dataRequestIntervalMs, assumedSourceDataUpdateRateMs);
// updateLocalData();
