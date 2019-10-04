// Paths to folders, services, and layers as global variables
const imgUrl = "https://maps.wakegov.com/elections/polling/img/"; // using existing polling app img folder
const addressUrl = "https://maps.wakegov.com/arcgis/rest/services/Property/Addresses/MapServer/0";
const precinctUrl = "https://services1.arcgis.com/a7CWfuGP5ZnLYE7I/ArcGIS/rest/services/Precincts/FeatureServer/0";
const pollingPlaceUrl = "https://maps.wakegov.com/arcgis/rest/services/Electoral/PollingPlaces/FeatureServer/0";
const resultsSection = document.getElementById("resultsSection");
const resultsDiv = document.getElementById("results");


// Define views/widgets/layers as global so they are accessible in the console
// will change this after development.
let view;
let searchWidget;
let addressFeatureLayer;
let precinctFeatureLayer;
let pollingPlaceFeatureLayer;
require([
  "esri/WebMap",
  "esri/views/MapView",
  "esri/widgets/Search",
  "esri/tasks/Locator",
  "esri/widgets/Home",
  "esri/widgets/Locate",
  "esri/geometry/Extent",
  "esri/widgets/ScaleBar",
  "esri/tasks/support/Query",
  "esri/layers/FeatureLayer",
  "esri/geometry/Point",
  "esri/geometry/SpatialReference",
  "esri/request",
  "esri/geometry/geometryEngine",
  "esri/Graphic",
  "esri/geometry/support/webMercatorUtils",
  "dojo/domReady!"
], function(WebMap, MapView, Search, Locator, Home, Locate, Extent,
  ScaleBar, Query, FeatureLayer, Point, SpatialReference, esriRequest,
  geometryEngine, Graphic, webMercatorUtils) {

  // ADD WebMap Reference //
  const map = new WebMap({
    portalItem: {
      id: "11264020cf8444f78151ebc8c4d49862"
    }
  });

  const defaultExtent = new Extent({
    xmin: -8794761,
    ymin: 4232693,
    xmax: -8710833,
    ymax: 4311882,
    spatialReference: {
      wkid: 102100
    },
  });
  // ADD WebMap View //
  view = new MapView({
    container: "viewDiv",
    map: map,
    extent: defaultExtent,
    constraints: {
      minScale: 8000,
      maxScale: 2000000,
    },
  });
// UNCOMMENT THESE AFTER DEVELOPMENT
  // view.on("mouse-wheel", function(mouseWheelEvent) {
  //   // prevents zooming with the mouse-wheel event
  //   mouseWheelEvent.stopPropagation();
  // });
  // view.on("drag", function(dragEvent) {
  //   // prevents panning with the mouse drag event
  //   dragEvent.stopPropagation();
  // });
  // view.on("key-down", function(keyDownEvent) {
  //   // prevents panning with the arrow keys
  //   const keyPressed = keyDownEvent.key;
  //   if (keyPressed.slice(0, 5) === "Arrow") {
  //     keyDownEvent.stopPropagation();
  //   }
  // });

  // ADD Address point feature layer for Search Widget to use //
  addressFeatureLayer = new FeatureLayer({
    url: addressUrl,
  });

  // ADD precinct feature layer //
  precinctFeatureLayer = new FeatureLayer({
    url: precinctUrl,
  });

  // ADD polling place feature layer //
  pollingPlaceFeatureLayer = new FeatureLayer({
    url: pollingPlaceUrl,
    popupEnabled: true,
    popupTemplate: {
      title: "{POLL_PL}",
      content: `
      <div id='popup'>
        {POLL_PL} is located at {ST_NUMBER} {ST_NAME} in {CITY} and serves precinct {PRECINCT}. <br/><br/>
      </div>
      <div id='popcarousel' class='carousel slide' data-ride='carousel' data-interval='false'>
        <div class='carousel-inner'>
          <div class='item active'>
            <a href='${imgUrl}{PRECINCT}.jpg' target='_blank'><img class='photo' src='${imgUrl}{PRECINCT}.jpg'></a>
          </div>
          <div class='item'>
            <a href='${imgUrl}{PRECINCT} 2.jpg' target='_blank'><img class='photo' src='${imgUrl}{PRECINCT} 2.jpg'></a>
          </div>
        </div>
        <a class='carousel-control left' href='#popcarousel' role='button' data-slide='prev'>
          <span class='glyphicon glyphicon-chevron-left' aria-hidden='true'></span>
        </a>
        <a class='carousel-control right' href='#popcarousel' role='button' data-slide='next'>
          <span class='glyphicon glyphicon-chevron-right' aria-hidden='true'></span>
        </a>
      </div>
    </div>
    `,
    },
  });
  map.add(pollingPlaceFeatureLayer)

  // ADD Default Extent Button //
  const homeWidget = new Home({
    view: view
  });
  view.ui.add(homeWidget, {
    position: "top-left",
    index: 0,
  });

  // ADD Search Widget //
  const getSearchSuggestions = function(searchParams) {
    // Overwrite builtin getSuggestions function for searchWidget
    const requestUrl = `${addressUrl}/query?orderByFields=FULLADDR&returnGeometry=false&outFields=FULLADDR,POSTAL_CITY&returnDistinctValues=true&f=json&where=FULLADDR+LIKE+%27${searchParams.suggestTerm.toUpperCase()}%25%27&orderByFields=FULLADDR&resultRecordCount=5`

    return fetch(requestUrl)
    .then(response => response.json()) // specify response type as json
    .then(data => { // then get data from response
      return data.features.map(feature => {
        return {
          key: feature.attributes.FULLADDR,
          text: `${feature.attributes.FULLADDR}, ${feature.attributes.POSTAL_CITY}`, // The suggestion text to show
          sourceIndex: searchParams.sourceIndex,
        }
      })
    })
    .catch(err => console.error(err));
  };
  const getSearchResults = function() {
    // Overwrite builtin getResults function for searchWidget
    const searchTerm = searchWidget.searchTerm
      .split(", ")[0].toUpperCase();
    if (searchTerm !== "") {
      const requestUrl = `${addressUrl}/query?orderByFields=FULLADDR&returnGeometry=true&outFields=FULLADDR,POSTAL_CITY&returnDistinctValues=false&f=json&where=FULLADDR+LIKE+%27${searchTerm}%25%27&outSR=102100&orderByFields=FULLADDR&resultRecordCount=5`
      return fetch(requestUrl) //
      .then(response => response.json()) // specify response type as json
      .then(responseData => {
        const addressPointFeature = responseData.features[0];
        const addressPointGraphic = new Graphic({
          geometry: {
            type: "point",
            x: addressPointFeature.geometry.x,
            y: addressPointFeature.geometry.y,
            spatialReference: {
              wkid: 102100
            },
          },
          attributes: addressPointFeature.attributes,
          popupTemplate: {
            title: "Address",
            content: "{FULLADDR}, {POSTAL_CITY}",
          },
          symbol: {
            type: "simple-marker",
            color: "#0070FF",
            size: 8,
          },
        });
        const addressPointBuffer = geometryEngine.geodesicBuffer(
          addressPointGraphic.geometry, 600, "feet");
        const searchResult = [{
          extent: addressPointBuffer.extent,
          feature: addressPointGraphic,
          name: addressPointFeature.attributes.FULLADDR,
        }];
        return searchResult;
      })
      .catch(error => console.error(error));
    } else {
      console.warn(`searchTerm is an empty string`);
    };
  };
  const wakeCountyAddressesSearchSource = {
    name: "Wake County Addresses",
    popupEnabled: true,
    popupTemplate: {
      title: "Address",
      content: "{FULLADDR}, {POSTAL_CITY}",
    },
    minSuggestCharacters: 1,
    maxResults: 1,
    placeholder: "Search your address",
  };

  searchWidget = new Search({
    view: view,
    sources: [wakeCountyAddressesSearchSource],
    includeDefaultSources: false, //don't include Esri World geocoding service
    locationEnabled: false,
    autoSelect: false,
  }, "searchDiv");

  searchWidget.sources.items[0].__proto__.getSuggestions = getSearchSuggestions;
  searchWidget.sources.items[0].__proto__.getResults = getSearchResults;

  searchWidget.viewModel.watch("selectedSuggestion", searchSuggestion => {
    // Fires search widget when the selected suggestion changes, which
    // allows it to fire when a suggestion is clicked, rather than having to
    // hit enter after clicking a suggestion.
    if (searchSuggestion != null) {
      searchWidget.search(searchSuggestion);
    } else {
      console.warn("Suggestion empty");
    }
  });

  searchWidget.on("search-clear", (searchClearEvent) => {
    // console.log("Clear search event fired:", searchClearEvent);
    // Remove the resultDiv, reset pollingPlace layer,
    // close popups, remove address graphic, and go to default extent
    resultsSection.style.display = "none";
    pollingPlaceFeatureLayer.definitionExpression = "";
    view.popup.close();
    view.graphics.removeAll();
    view.goTo(defaultExtent);
  });

  homeWidget.container.addEventListener("click", homeWidgetClickEvent => {
    // Clear the search widget when home button is clicked
    searchWidget.clear();
  });

  searchWidget.on("search-complete", searchCompleteEvent => {
    view.popup.close(); // Close any previosuly opened popups
    view.graphics.removeAll(); // Remove any previosuly added graphics
    if (searchTermsMatch(searchCompleteEvent)) {
      const searchResult = constructSearchResult(searchCompleteEvent);
      console.log("The constructed search result is:", searchResult);
      getPollingPlace(searchResult.result.feature)
      .then(pollingPlace => {
        console.log("The polling place is:", pollingPlace);
        displayResultsSection(searchResult, pollingPlace);
        displayResultsOnMap(searchResult, pollingPlace);
      }).catch(error => console.error(error));;
    } else {
      console.warn(
        `Search aborted because the searchTermFromSearchbar (${searchTermFromSearchbar}) and searchTermFromResult (${searchTermFromResult}) are not equal.`
      );
    };
  });

  function displayResultsOnMap(searchResult, pollingPlace){
    // goTo the extent of the address point and its polling place,
    // add a graphic for the address, and open its popup
    addressAndPollingPlaceExtent = getAddressAndPollingPlaceExtent(searchResult, pollingPlace);
    pollingPlaceFeatureLayer.definitionExpression = `PRECINCT = '${pollingPlace.attributes.PRECINCT}'`;
    view.goTo(addressAndPollingPlaceExtent);
    view.graphics.add(searchResult.result.feature);
    view.popup.open({
      features: [searchResult.result.feature],
      location: searchResult.result.feature.geometry,
      actions: null,
    });
  }

  function getAddressAndPollingPlaceExtent(searchResult, pollingPlace){
    // get the union of the extent of the address point and polling place
    // and return an extent
    const pollingPlaceBuffer = geometryEngine.geodesicBuffer(
      pollingPlace.geometry, 600, "feet");
    const addressAndPollingPlaceExtent = searchResult.result.extent.union(pollingPlaceBuffer.extent);
    return addressAndPollingPlaceExtent;
  };

  function searchTermsMatch(searchCompleteEvent){
    // return true if the search term in the search result matches
    // the search term in the search bar, and false if they don't.
    const searchTermFromSearchbar = searchCompleteEvent.searchTerm.split(
      ", ")[0].toUpperCase();
    const searchTermFromResult = searchCompleteEvent.results[0].results[0].name;
    if ((searchCompleteEvent.numResults !== 0) && (searchTermFromSearchbar === searchTermFromResult)) {
      return true;
    }  else {
      return false;
    };
  };

  function constructSearchResult(searchCompleteEvent){
    // take in a search-complete event (from search widget) and
    // return an object of the search result
    result = {
      result: searchCompleteEvent.results[0].results[0],
      source: searchCompleteEvent.results[0].source,
      sourceIndex: searchCompleteEvent.activeSourceIndex,
      target: searchCompleteEvent.target,
    };
    return result;
  }

  function displayResultsSection(searchResult, pollingPlace){
    // Take in the search result and its polling place, then get the
    // google maps URL for driving directions and display the
    // results section and populate its innerHTML
    const googleMapsUrl = getGoogleMapsUrl(searchResult.result.feature, pollingPlace);
    resultsSection.style.display = "block";
    const precinct = pollingPlace.attributes.PRECINCT;
    const resultInnerHTML = `
      <p class="result-text">
        The polling place for<br/> ${searchResult.result.feature.attributes.FULLADDR}, ${searchResult.result.feature.attributes.POSTAL_CITY} is:<br/>
        <br/>
        <strong>${pollingPlace.attributes.POLL_PL}</strong><br/>
        ${pollingPlace.attributes.ST_NUMBER} ${pollingPlace.attributes.ST_NAME}, ${pollingPlace.attributes.CITY}<br/>
        Precinct ${precinct}<br/>
        <br/>
        <a class='directions-link' href='${googleMapsUrl}' target='_blank'>Driving Directions</a>
      </p>
      <div id="photodiv">
				<div id="carousel" class="carousel slide" data-ride="carousel" data-interval="false">
				  <div class="carousel-inner">
					<div class="item active">
					  <a id="photolinkA" href="${imgUrl}${precinct}.jpg" target="_blank"><img id="photoA" class="photo" src="${imgUrl}${precinct}.jpg"></a>
					</div>
					<div class="item">
					  <a id="photolinkB" href="${imgUrl}${precinct} 2.jpg" target="_blank"><img id="photoB" class="photo" src="${imgUrl}${precinct} 2.jpg"></a>
					</div>
				  </div>
				  <a class="carousel-control left" href="#carousel" role="button" data-slide="prev">
					<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>
				  </a>
				  <a class="carousel-control right" href="#carousel" role="button" data-slide="next">
					<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>
				  </a>
				</div>
			</div>
    `;
    resultsDiv.innerHTML = resultInnerHTML;
  };

  function getPollingPlace(pointFeature){
    // Takes a point Feature and returns a promise that resolves a string
    // of HTML of polling place information for the precinct in
    // which the address point falls.
    return new Promise((resolve, reject) => {
      getPrecinct(pointFeature)
      .then(precinct => {
        pollingPlaceFeatureLayer.queryFeatures({
          where: `PRECINCT = '${precinct}'`,
          returnGeometry: true,
          outSpatialReference: 102100,
          outFields: ["PRECINCT", "POLL_PL",
            "ST_NUMBER", "ST_NAME", "CITY"],
        })
        .then(response => resolve(response.features[0]))
        .catch(error => reject(error));
      })
      .catch(error => reject(error));
    });
  };

  function getPrecinct(pointFeature) {
    // Takes a point Feature and returns a promise that resolves a
    // string of the precinct in which the address point falls
    return new Promise((resolve, reject) => {
      precinctFeatureLayer.queryFeatures({
        geometry: pointFeature.geometry,
        spatialRelationship: "intersects",
        outFields: ["PRECINCT"],
      })
      .then(response => resolve(response.features[0].attributes.PRECINCT))
      .catch(error => reject(error));
    });
  };

  function getGoogleMapsUrl(fromFeature, toFeature) {
    // Takes two features and returns the google maps url that finds
    // the directions from the first feature to the second feature
    const fromxy = webMercatorUtils.xyToLngLat(fromFeature.geometry.x, fromFeature.geometry.y);
    const toxy = webMercatorUtils.xyToLngLat(toFeature.geometry.x, toFeature.geometry.y);
    const googleMapsUrl = `https://www.google.com/maps/dir/${fromxy[1]},${fromxy[0]}/${toxy[1]},${toxy[0]}`;
    return googleMapsUrl;
  };

// *****************************************************************
// *****************************************************************
  // 10/4/19: Maybe rewrite getResults and getSuggestions functions to use the addressFeatureLayer instead of going to the rest directory via the fetch api.
// *****************************************************************
// *****************************************************************

});


const searchHeaderContainer = document.getElementById("searchHeaderContainer");

document.getElementById("voterReg")
  .addEventListener("mouseenter", (e) => {
    // Pushes search container down to make room for Voter Registration
    // dropdown menu when on mobile displays.
    if (screen.width < 768) {
      searchHeaderContainer.style.marginTop = "30px";
    }
});

document.getElementById("voterReg")
  .addEventListener("mouseout", (e) => {
    // Pushes search container back up when Voter Registration
    // dropdown menu closes when on mobile displays.
    searchHeaderContainer.style.marginTop = "0px";
});
