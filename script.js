'use strict'
// [info]
// Moscow - Sat, 21:32:48 MSK
// create by: Vadim Stepanyuk
// link: https://github.com/VaskillerDev

// [notation] Global values. State of control.
// Global instances
// captureElemFlightNumber  -   Flight number which communicates with localStorage
// table                    -   Table for view
// sortBottom               -   Sort distance between aircraft and airport: true - from less to more / false - from more to less

let captureElemFlightNumber = (() => window.localStorage.getItem("captureElemFlightNumber") || "")();

const table = document.getElementById('tbody__liveReload');

let sortBottom = true;

// Global functions
// focusElem                    -   For focus element inline style (using for row table)
// focusElem                    -   For unfocus element inline style (using for row table)
// updateColorForCaptureElem    -   Update color on capture flight element
// sortFunction                 -   Function which reproduce function for sorting elements
// invertSort                   -   Invert sorting. (using for click button id: th__button_sort), with re-render view.
// renderTableFromNetwork       -   Render data to view
function focusElem(e) {
    if (e.children[0].textContent === captureElemFlightNumber) {
        return;
    }
    e.style = "background-color: #edfaff;"
}

function unfocusElem(e) {
    if (e.children[0].textContent === captureElemFlightNumber) {
        return;
    }
    e.style = "background-color: white;"
}

function updateColorForCaptureElem(color) {
    if (captureElemFlightNumber !== "") {
        try {
            let previousElem = document.evaluate(`.//table/tbody/tr//td[text()='${captureElemFlightNumber}']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            previousElem.parentElement.style = `background-color: ${color}`
        } catch (err) {
            console.log("CaptureElement not found");
        }
    }
}

function clickCaptureElem(e) {
    updateColorForCaptureElem('white');
    e.style = "background-color: #89b2d9";
    captureElemFlightNumber = e.children[0].textContent;
    window.localStorage.setItem('captureElemFlightNumber', captureElemFlightNumber);
}

const sortFunction = (left, right) =>
    sortBottom ?
        (left, right) => left - right :
        (left, right) => right - left;

function invertSort(e) {
    sortBottom = !sortBottom;
    sortBottom ?
        e.textContent = "Расстояние до Домодедово 🔼" :
        e.textContent = "Расстояние до Домодедово 🔽";
    renderTableFromNetwork().catch(()=>{console.warn("renderTableFromNetwork something was wrong")});
}

const renderTableFromNetwork = async () => {
    // Mutable storage. Where origin - API form network
    let aircraftsInfo = await moduleForDataFetch.getDataFromNetwork();
    aircraftsInfo = aircraftsInfo
        .filter((aircraft) => aircraft.flightNumber)
        .sort((left, right) => sortFunction()(left.airportDistance, right.airportDistance));

    table.innerHTML = " ";
    table.innerHTML = aircraftsInfo
        .reduce((accum, currentAircraftsInfo) =>
            accum.concat(currentAircraftsInfo.renderIt()), "");
    updateColorForCaptureElem("#89b2d9")
};

// [notation] Global modules and immutable constant values
// moduleForCoordinates - module for use coordinates and evaluation distance between two coordinates
// URL                  - use in moduleForDataFetch
// AirportCoordinates   - coordinates instance for this example
// moduleForDataFetch   - module for fetch JSON data from https://data-live.flightradar24.com/zones/fcgi/feed.js?bounds=56.84,55.27,33.48,41.48
// timeToUpdate         - time per update information about aircraft
const moduleForCoordinates = (() => {
    // Coordinates use for create new readonly Coordinates Instance
    // (any,any) => Object
    class Coordinates {
        constructor(latitude, longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
        }

        getLatitude = () => this.latitude;
        getLongitude = () => this.longitude;

        // Calculate distance between two coordinates
        // {any,any} => number || NaN
        calculateDistance = ({latitude, longitude}) => {
            // Use it for translate Coordinates (latitude or longitude) to radians value
            // {any} => number || NaN
            const coordinatesToRadians = (maybeValue) =>
                maybeValue * Math.PI / 180;

            const EARTH_RADIUS = 6372795;

            let selfLatitude = coordinatesToRadians(this.latitude);
            let selfLongitude = coordinatesToRadians(this.longitude);

            let otherLatitude = coordinatesToRadians(latitude);
            let otherLongitude = coordinatesToRadians(longitude);

            // Cos for latitude
            let selfCosLatitude = Math.cos(selfLatitude);
            let otherCosLatitude = Math.cos(otherLatitude);

            // Sin for latitude
            let selfSinLatitude = Math.sin(selfLatitude);
            let otherSinLatitude = Math.sin(otherLatitude);

            // Delta
            let delta = otherLongitude - selfLongitude;
            let cosDelta = Math.cos(delta);
            let sinDelta = Math.sin(delta);

            // Vector calculate
            let vectorX = selfSinLatitude * otherSinLatitude + selfCosLatitude * otherCosLatitude * cosDelta;
            let vectorY = Math.sqrt(
                Math.pow(otherCosLatitude * sinDelta, 2) +
                Math.pow(selfCosLatitude * otherSinLatitude - selfSinLatitude * otherCosLatitude * cosDelta, 2)
            );

            let atan2Component = Math.atan2(vectorY, vectorX);
            return atan2Component * EARTH_RADIUS;
        }
    }

// Reproduces point from coordinates
// (number,number) => Object || null
    const coordinatesFactory = (latitude, longitude) => {

        // Checking valid properties of value:
        // is not empty value
        // is float
        // (any) -> bool
        const isValidValue = (maybeValue) => {
            // Check is value of float type
            const isFloat = (maybeFloat) =>
                maybeFloat === +maybeFloat && maybeFloat !== (maybeFloat | 0);

            // Check is value of integer type
            const isInteger = (maybeInteger) =>
                maybeInteger === +maybeInteger && maybeInteger === (maybeInteger | 0);

            // Check is value is not empty
            if (maybeValue === undefined || maybeValue === null || isNaN(maybeValue))
                return false;

            return isInteger(maybeValue) || isFloat(maybeValue);
        };

        return (isValidValue(latitude) && isValidValue(longitude)) ? new Coordinates(latitude, longitude) : null;
    };

    return {
        Coordinates,
        coordinatesFactory
    }

    // [test]
    /*(async (debug) => {
        if (!debug) {return;}

        const validCoordinates =  coordinatesFactory(1.000001,2.0);
        const validCoordinatesFromParseFloat = coordinatesFactory(Number.parseFloat("1.000001"),Number.parseFloat("2.0"));
        const invalidCoordinates = coordinatesFactory("1.000001","2.0");

        console.assert(
            validCoordinates !== null,
            `Error in: ${validCoordinates}`
        );
        console.assert(
            validCoordinatesFromParseFloat !== null,
            `Error in: ${validCoordinatesFromParseFloat}`
        );
        console.assert(
            invalidCoordinates === null,
            `Error in: ${invalidCoordinates}`
        );
        console.log("!");

    })(false);*/

})();

const URL = 'https://data-live.flightradar24.com/zones/fcgi/feed.js?bounds=56.84,55.27,33.48,41.48'; // Flightradar24
const AirportCoordinates = moduleForCoordinates.coordinatesFactory(55.410307, 37.902451); // Domodedovo airport
const timeToUpdate = 5000;

const moduleForDataFetch = ((url) => {

    // It's class contain structured information about aircrafts
    class AircraftInfo {
        constructor(flightNumber, track, groundSpeed, calibratedAltitude, coordinates, {from, to}, airportCoordinates) {
            this.flightNumber = flightNumber;
            this.track = track;
            this.groundSpeed = Math.floor(groundSpeed * 1, 852);
            this.calibratedAltitude = Math.floor(calibratedAltitude * 0.3048);
            this.coordinates = coordinates;
            this.path = {from, to};
            this.airportDistance = Math.floor(airportCoordinates.calculateDistance(coordinates));
        };

        // Render object into HTML
        renderIt = () =>
            '<tr onmouseenter="focusElem(this)" onmouseleave="unfocusElem(this)" onclick="clickCaptureElem(this)">' +
            `<td>${this.flightNumber || '-'}</td>` +
            `<td>${this.track + '°' || '-'}</td>` +
            `<td>${this.groundSpeed + 'km/h' || '-'}</td>` +
            `<td>${this.calibratedAltitude + 'm' || '-'}</td>` +
            '<td>' +
            `Lat: ${this.coordinates.latitude || '-'}, Long: ${this.coordinates.longitude || '-'}` +
            '</td>' +
            `<td>${this.path.from || '-'}</td>` +
            `<td>${this.path.to || '-'}</td>` +
            `<td style='text-align: center;'>${this.airportDistance + 'm' || '-'} </td>` +
            '</tr>'
    }

    const getDataFromNetwork = async () => {
        let rawData = await fetch(URL).then(data => data.json());
        // Convert Object to Array and clear unused elements
        let arrays = await Object.entries(rawData).filter(elem => elem[1].length > 2);
        // Aircraft fileds from JSON
        // where:
        //13 - flight number
        //3 - track
        //5 - groundSpeed
        //4 - calibrated altitude
        //{1,2} -  coordinates
        //{11,12} - {from,to} (airport short name)
        return arrays.map(ari => new moduleForDataFetch.AircraftInfo(
            ari[1][13],
            ari[1][3],
            ari[1][5],
            ari[1][4],
            moduleForCoordinates.coordinatesFactory(ari[1][1], ari[1][2]),
            {from: ari[1][11], to: ari[1][12]},
            AirportCoordinates
        ));
    }
    return {AircraftInfo, getDataFromNetwork};
})(URL);

// Main input point. Сode is start from here.
(async () => {
    renderTableFromNetwork();

    setInterval(async () => {
        renderTableFromNetwork();
    }, timeToUpdate);

})();
