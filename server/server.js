import express from 'express';
import {
    EMPTY_VATSIM_DATA,
    SERVER_PORT
} from './serverConstants.js';
import {
    initializeVatsimDataRequestSchedule
} from './serverUtilities.js';

const app = express();
// TODO: This will be mutated by initializeVatsimDataRequestSchedule()
// There are better and clearer ways to do this!
let latestPilotData = EMPTY_VATSIM_DATA; // eslint-disable-line prefer-const

app.get('/getUpdatedData', (req, res) => {
    res.send(latestPilotData);
});

// serve index.html, css, images, scripts all in one instead of using app.get()
app.use(express.static('dist/client'));
app.listen(SERVER_PORT, () => {
    console.log(`Listening on port ${SERVER_PORT}`);
});

initializeVatsimDataRequestSchedule(latestPilotData);