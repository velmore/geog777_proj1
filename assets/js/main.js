// --------------------------------------------------------------------------
// DEFINE GLOBAL VARIABLES
// mapbox access token
var accessToken = 'pk.eyJ1IjoiamhjYXJuZXkiLCJhIjoiY2pmbHE2ZTVlMDJnbTJybzdxNTNjaWsyMiJ9.hoiyrXTX3pOuEExAnhUtIQ';

var mapboxTiles = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=' + accessToken, {
    attribution: '<a href="https://www.mapbox.com/feedback/">Mapbox</a> <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	id: 'mapbox/light-v10',
});

var map = L.map('map', {
    zoomControl: false,
    center: [44.57, -88],
    zoom: 7,
});

L.control.zoom({
    position: 'topleft'
}).addTo(map);

// Layer Styles
var wellSitesStyle = {
    radius: 3,
    fillColor: "black",
    color: "white",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};

// Map Features
var wellPoints;
var censusTracts;
var nitrateLevels;
var errors;

// Choropleth Legend
var legend;

// Map Layers
var wellLayer = L.geoJSON(null, {
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, wellSitesStyle);
    }
}).addTo(map);;
//var states = L.geoJSON(null, {style:styleStates}).addTo(map);		
var censusLayer = L.geoJSON(null, {style:styleTracts}).addTo(map);
//var countiesLayer = L.geoJSON(null, {style:styleCounty}).addTo(map);
var nitrateLayer = L.geoJSON(null, {style:styleInterpolation});
var errorLayer = L.geoJSON(null, {style:styleError});
// var cancerRates = L.geoJSON(null, {style:styleCancer});

var legendControl = L.control({position: 'bottomleft'});

// HTML Elements
var exponentInput = document.getElementById("exponent");
//var cellSizeInput = document.getElementById("cellSize");
var interpolateButton = document.getElementById("interpolate");
var removeInterpolateButton = document.getElementById("removeInterpolate");
var calculateButton = document.getElementById("calculate");
var loader = document.getElementById("loader");
var regressionLoader = document.getElementById("regressionLoader");
var results = document.getElementById("results");
var slopeDisplay = document.getElementById("slope");
var intersectDisplay = document.getElementById("intersect");
var errorLoader = document.getElementById("errorLoader");
var errorButton = document.getElementById("errorButton");
var removeResidualsButton = document.getElementById("removeResiduals");
var interpolateTip = document.getElementById("interpolationTip"),
    regressionTip = document.getElementById("regressionTip"),
    errorTip = document.getElementById("errorTip");
var interpolatePopup = document.getElementById("interpolatePopup"),
    regressionPopup = document.getElementById("regressionPopup"),
    errorPopup = document.getElementById("errorPopup");

loader.hidden = true;
regressionLoader.hidden = true;
errorLoader.hidden = true;
interpolateButton.disabled = true;
errorButton.disabled = true;

// User Editable Variables
var exponent = 1;
var cellSize = 5;

// Calculated Values
var regressionEq;

// END DEFINE GLOBAL VARIABLES
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// BUILD MAP
// add the mapbox tiles to the map object
map.addLayer(mapboxTiles);


// addLayers(layers);
addWellSites();
addCensusTracts();
//addCounties();
//addStates();

// END BUILD MAP
// --------------------------------------------------------------------------


// ADD LAYER CONTROLS
// --------------------------------------------------------------------------
var legendLayers = {
    "Nitrate Samples": wellLayer,
    "Census Blocks" : censusLayer,
    //"Counties" : countiesLayer
};

L.control.layers(null, legendLayers, {position: 'topleft'}).addTo(map);
// --------------------------------------------------------------------------


// ADD EVENT LISTENERS
// --------------------------------------------------------------------------
exponentInput.addEventListener("change", function(){
    exponent = Number(exponentInput.value);
});

//cellSizeInput.addEventListener("change", function(){
  //  cellSize = Number(cellSizeInput.value);
//});

interpolateButton.addEventListener("click", function(){
    loader.hidden = false;
    $.ajax({
        success:function(){
            createInterpolation(wellPoints);
            nitrateLayer.addTo(map);
            addInterpolateLegend();
            loader.hidden = true;
            calculateButton.disabled = false;
        }
    });
});

removeInterpolateButton.addEventListener("click",function(){
    map.removeLayer(nitrateLayer);
	addCensusLegend();
	errorButton.disabled = true;
	calculateButton.disabled = true;
	removeInterpolateButton.disabled = true;
});

calculateButton.addEventListener("click", function(){
    regressionLoader.hidden = false;
    $.ajax({
        success:function(){
            regressionEq = calculateRegression();
            regressionLoader.hidden = true;
            results.hidden = false;
            slopeDisplay.innerText = Number(regressionEq.m).toFixed(2);
            intersectDisplay.innerText = Number(regressionEq.b).toFixed(2);
            errorButton.disabled = false;
        }
    });
});

errorButton.addEventListener("click", function(){
    errorLoader.hidden = false;
    $.ajax({
        success:function(){
            calculateError();
            errorLayer.addTo(map);
            addErrorLegend();
            errorLoader.hidden = true;
			removeResidualsButton.disabled = false;
        }
    });

});

removeResidualsButton.addEventListener("click",function(){
    map.removeLayer(errorLayer);
	addInterpolateLegend();
	removeResidualsButton.disabled = true;
	
	
});

// map.on('click', function(e){
//     var coord = e.latlng;
//     var lat = coord.lat;
//     var lng = coord.lng;
//     console.log("You clicked the map at latitude: " + lat + " and longitude: " + lng);
// });

interpolateTip.addEventListener("mouseover",function(){
    interpolatePopup.classList.add("show");
});

interpolateTip.addEventListener("mouseout",function(){
    interpolatePopup.classList.remove("show");
});


regressionTip.addEventListener("mouseover",function(){
    regressionPopup.classList.add("show");
});

regressionTip.addEventListener("mouseout",function(){
    regressionPopup.classList.remove("show");
});

errorTip.addEventListener("mouseover",function(){
    errorPopup.classList.add("show");
});

errorTip.addEventListener("mouseout",function(){
    errorPopup.classList.remove("show");
});
// --------------------------------------------------------------------------


// Define Functions

//function addStates(){
    //$.ajax("assets/data/states.geojson", {
      //  dataType: "json",
        //success: createStateLayer
   // });
//};
function addCounties(){
    $.ajax("assets/data/WICounties.geojson", {
        dataType: "json",
        success: createCountyLayer
    });
};

function createCountyLayer(response, status, jqXHRobject){
    countiesLayer.addData(response);
    countiesLayer.bringToBack(map);
};

// Rename all functions and variables
function addCensusTracts(){
    $.ajax("assets/data/WICensusTracts.geojson", {
        dataType: "json",
        success: createCensusLayer
    });
};

function createCensusLayer(response, status, jqXHRobject){

    censusTracts = response;

    censusLayer.addData(response)
    censusLayer.bringToBack(map);

    addCensusLegend();
};


// Define Functions
function addWellSites(){
    $.ajax("assets/data/WellSites.geojson", {
        dataType: "json",
        success: createWellSitesLayer
    });
};

function createWellSitesLayer(response, status, jqXHRobject){
    wellPoints = response;

    wellLayer.addData(wellPoints, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, wellSitesStyle);
        }
    });
    wellLayer.bringToFront(map);


    // Make the interpolation button active
    interpolateButton.disabled = false;

    // createInterpolation(wellPoints);
};


function createInterpolation(wellPoints){
    // map.removeLayer(nitrateLayer);
    nitrateLayer.clearLayers();

    // var options = {gridType: 'hex', property: 'nitr_ran', units: 'miles', weight: exponent};
    // var grid = turf.interpolate(wellPoints, 5, options);

    var options = {gridType: 'triangle', property: 'nitr_ran', units: 'miles', weight: exponent};
    nitrateLevels = turf.interpolate(wellPoints, cellSize, options);

    // console.log(grid);

    nitrateLayer.addData(nitrateLevels);

    loader.hidden = true;
    // nitrateLayer.addTo(map);

    // collectPoints(grid);
    // rates.bringToBack(map);
	removeInterpolateButton.disabled = false;
};


// function getInterpolationColor(d) {
//     return d > 5 ? '#993404' :
//         d > 4  ? '#d95f0e' :
//             d > 3  ? '#fe9929' :
//                 d > 1  ? '#fed98e' :
//                     '#ffffd4';
// }


function getInterpolationColor(d) {
    return d > 5 ? '#54278f' :
        d > 4  ? '#756bb1' :
            d > 3  ? '#9e9ac8' :
                d > 1  ? '#cbc9e2' :
                    '#f2f0f7';
}

function styleInterpolation(feature) {
    return {
        fillColor: getInterpolationColor(feature.properties.nitr_ran),
        weight: 0.5,
        opacity: 1,
        color: 'white',
        fillOpacity: 1
    };
}

// function getTractsColor(d) {
//     return d > .8 ? '#993404' :
//         d > .6  ? '#d95f0e' :
//             d > .4  ? '#fe9929' :
//                 d > .2  ? '#fed98e' :
//                     '#ffffd4';
// }

function getTractsColor(d) {
    return d > .8 ? '#DA1F05' :
        d > .6  ? '#F33C04' :
            d > .4  ? '#FE650D' :
                d > .2  ? '#FFC11F' :
                    '#FFF75D';
}

function styleTracts(feature) {
    return {
        fillColor: getTractsColor(feature.properties.canrate),
        weight: 0.5,
        opacity: 1,
        color: 'black',
        fillOpacity: 0.7
    };
};

function styleCounty(feature) {
    return {
        fillColor: 'false',
        weight: 2,
        opacity: 1,
        color: 'black',
        fillOpacity: 0
    };
};

//function styleStates(feature) {
  //  return {
    //    fillColor: 'white',
      //  weight: 0.5,
        //opacity: 1,
        //color: '#D3D3D3',
        //fillOpacity: 0.5
   // };
//};

function styleError(feature){
    return {
        fillColor: getErrorsColor(feature.properties.errorLevel),
        weight: 0.5,
        opacity: 1,
        color: 'white',
        fillOpacity: 1
    };
};
//
// function getErrorsColor(d){
//     return d > 12 ? '#49006a' :
//         d > 9  ? '#ae017e' :
//             d > 6  ? '#f768a1' :
//                 d > 3  ? '#fcc5c0' :
//                     '#fff7f3';
// }


function getErrorsColor(d){
    // return d > 12 ? '#980043' :
    //     d > 9  ? '#dd1c77' :
    //         d > 6  ? '#df65b0' :
    //             d > 3  ? '#d7b5d8' :
    //                 '#f1eef6';

    return d > .6 ? '#E0218A' :
        d > .3  ? '#F9588D' :
            d > .1  ? '#ECB0B6' :
                d > 0  ? '#E5C2B4' :
                    '#4E8644';
}


function calculateRegression(){
    // console.log("Calculate Regression Started");

    var tractCentroids = [];

    turf.featureEach(censusTracts, function(currentFeature, featureIndex){
        var centroid = turf.centroid(currentFeature);
        centroid.properties = {canrate:currentFeature.properties.canrate};
        tractCentroids.push(centroid);
    });

    var collected = turf.collect(nitrateLevels, turf.featureCollection(tractCentroids), 'canrate', 'canrate');

    var emptyBins = []
    var bins = []
    turf.featureEach(collected, function(currentFeature, featureindex){
        if(currentFeature.properties.canrate.length > 0){
            var sum = 0
            for (var i = 0; i < currentFeature.properties.canrate.length; i++){
                sum += currentFeature.properties.canrate[i];
            }
            var canRate = sum / currentFeature.properties.canrate.length

            // currentFeature.properties.canrate = canRate;
            bins.push([currentFeature.properties.nitr_ran, canRate]);
        }
        else {
            emptyBins.push(currentFeature);
        }
    });

    // console.log(bins);
    console.log(ss.linearRegression(bins));
    // console.log("Calculate Regression Finished");

    return ss.linearRegression(bins);
};


function calculateError(){
    errors = censusTracts;
    var min = 0, max = 0;
    turf.featureEach(errors, function(currentFeature, featureindex) {

        // var canRate = Number(currentFeature.properties.canrate);
        // var nitrate = Number(currentFeature.properties.nitrate);
        // var calcNitrate = Number((regressionEq.m * canRate) + regressionEq.b).toFixed(2)
        //
        // var error = calcNitrate - nitrate

        var canRate = Number(currentFeature.properties.canrate);
        var nitrate = Number(currentFeature.properties.nitrate);
        var calcCancer = Number((regressionEq.m * nitrate) + regressionEq.b).toFixed(2)

        var error = canRate - calcCancer;

        //
        //
        // if (error < min) {
        //     min = error;
        // }
        // if (error > max){
        //     max = error;
        // }

        currentFeature.properties.errorLevel = Math.abs(error);
    });
    //
    // console.log(min);
    // console.log(max);
    errorLayer.addData(errors);
    console.log(errors);
};

function addCensusLegend(){
    legendControl.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
            grades = [0, .2, .4, .6, .8],
            labels = [];
		
		div.innerHTML += '<b>Cancer Rates</b><br>'  

        for (var i = 0; i < grades.length; i++) {
			div.innerHTML += '<i style="background:' + getTractsColor(grades[i] + .1) + '"></i> ' + grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
		}
		return div;
		};
    
    legendControl.addTo(map);
    legend = document.getElementsByClassName('legend')[0];
    console.log(legend);
};

function addInterpolateLegend(){
    legend.innerHTML = "";

    var grades = [0, 1, 3, 4, 5],
        labels = [];
	
	legend.innerHTML += '<b>IDW Surface</b><br>' 

    for (var i = 0; i < grades.length; i++) {
        legend.innerHTML +=
            '<i style="background:' + getInterpolationColor(grades[i] + .1) + '"></i> ' + grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
		}
};

function addErrorLegend(){
    legend.innerHTML = "";


    var grades = [-0.2, 0, .1, .3, .6],
        labels = [];
	
	legend.innerHTML += '<b>Residuals</b><br>'

    for (var i = 0; i < grades.length; i++) {
        legend.innerHTML +=
            '<i style="background:' + getErrorsColor(grades[i] + .1) + '"></i> ' + grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
		}
};
