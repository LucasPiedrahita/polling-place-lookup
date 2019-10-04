// Paths to folders, services, and layers as global variables
const imgUrl = 'https://maps.wakegov.com/elections/polling/img/'; // using existing polling app img folder
const addressUrl = 'https://maps.wakegov.com/arcgis/rest/services/Property/Addresses/MapServer/0';
const precinctUrl = 'https://services1.arcgis.com/a7CWfuGP5ZnLYE7I/ArcGIS/rest/services/Precincts/FeatureServer/0';
const pollingPlaceUrl = 'https://maps.wakegov.com/arcgis/rest/services/Electoral/PollingPlaces/FeatureServer/0';



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
  "esri/widgets/CoordinateConversion",
  "esri/geometry/support/webMercatorUtils",
  "dojo/domReady!"
], function(WebMap, MapView, Search, Locator, Home, Locate, Extent, ScaleBar, Query, FeatureLayer, Point, SpatialReference, esriRequest, geometryEngine, Graphic, CoordinateConversion, webMercatorUtils) {
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
      title: '{POLL_PL}',
      content: `
      <div id='popup'>
        {POLL_PL} is located at {ST_NUMBER} {ST_NAME} in {CITY} and serves precinct {PRECINCT}. <br/><br/>
      </div>`,
      //   <div id='popcarousel' class='carousel slide' data-ride='carousel' data-interval='false'>
      //     <div class='carousel-inner'>
      //       <div class='item active'>
      //         <a href='${imgUrl}{PRECINCT}.jpg' target='_blank'><img class='photo' src='${imgUrl}{PRECINCT}.jpg'></a>
      //       </div>
      //       <div class='item'>
      //         <a href='${imgUrl}{PRECINCT} 2.jpg' target='_blank'><img class='photo' src='${imgUrl}{PRECINCT} 2.jpg'></a>
      //       </div>
      //     </div>
      //     <a class='carousel-control left' href='#popcarousel' role='button' data-slide='prev'>
      //       <span class='glyphicon glyphicon-chevron-left' aria-hidden='true'></span>
      //     </a>
      //     <a class='carousel-control right' href='#popcarousel' role='button' data-slide='next'>
      //       <span class='glyphicon glyphicon-chevron-right' aria-hidden='true'></span>
      //     </a>
      //   </div>
      // </div>
      // `,
    },
  });

  // ADD WebMap Reference //
  const map = new WebMap({
    portalItem: {
      id: "11264020cf8444f78151ebc8c4d49862"
    }
  });
  map.add(pollingPlaceFeatureLayer)

  defaultExtent = new Extent({
    xmin: -8794761,
    ymin: 4232693,
    xmax: -8710833,
    ymax: 4311882,
    spatialReference: new SpatialReference({wkid: 102100}),
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
  // view.on("mouse-wheel", function(event) {
  //   // prevents zooming with the mouse-wheel event
  //   event.stopPropagation();
  // });
  // view.on("drag", function(event) {
  //   // prevents panning with the mouse drag event
  //   event.stopPropagation();
  // });
  // view.on("key-down", function(event) {
  //   // prevents panning with the arrow keys
  //   var keyPressed = event.key;
  //   if (keyPressed.slice(0, 5) === "Arrow") {
  //     event.stopPropagation();
  //   }
  // });

  // ADD Default Extent Button //
  const homeWidget = new Home({
    view: view
  });
  view.ui.add(homeWidget, {
    position: 'top-left',
    index: 0,
  });

  // var ccWidget = new CoordinateConversion({
  //   view: view
  // });
  // view.ui.add(ccWidget, "bottom-left");



  // ADD Search Widget //
  searchWidget = new Search({
    view: view,
    sources: [{
      name: 'Wake County Addresses',
      popupEnabled: true,
      popupTemplate: {
        title: 'Address',
        content: '{FULLADDR}, {POSTAL_CITY}',
      },
      minSuggestCharacters: 1,
      maxResults: 1,
      placeholder: 'Search your address',
    }],
    includeDefaultSources: false, //don't include Esri World geocoding service
    locationEnabled: false,
    autoSelect: false,
  }, 'searchDiv');

  searchWidget.sources.items[0].__proto__.getSuggestions = function(params) {
    const requestUrl = `${addressUrl}/query?orderByFields=FULLADDR&returnGeometry=false&outFields=FULLADDR,POSTAL_CITY&returnDistinctValues=true&f=json&where=FULLADDR+LIKE+%27${params.suggestTerm.toUpperCase()}%25%27&orderByFields=FULLADDR&resultRecordCount=5`
    return fetch(requestUrl) //
    .then(response => response.json()) // specify response type as json
    .then(data => { // then get data from response
      return data.features.map(feature => {
        return {
          key: feature.attributes.FULLADDR,
          text: `${feature.attributes.FULLADDR}, ${feature.attributes.POSTAL_CITY}`, // The suggestion text to show
          sourceIndex: params.sourceIndex,
        }
      })
    })
    .catch(err => console.error(err));
  };
  searchWidget.sources.items[0].__proto__.getResults = function(params) {
    const searchTerm = searchWidget.searchTerm
      .split(', ')[0].toUpperCase();
    // console.log("getResults Start with searchTerm:", searchTerm);
    if (searchTerm !== '') {
      const requestUrl = `${addressUrl}/query?orderByFields=FULLADDR&returnGeometry=true&outFields=FULLADDR,POSTAL_CITY&returnDistinctValues=false&f=json&where=FULLADDR+LIKE+%27${searchTerm}%25%27&outSR=102100&orderByFields=FULLADDR&resultRecordCount=5`
      return fetch(requestUrl) //
      .then(response => response.json()) // specify response type as json
      .then(data => {
        const feature = data.features[0];
        const graphic = new Graphic({
          geometry: new Point({
            x: feature.geometry.x,
            y: feature.geometry.y,
            spatialReference: new SpatialReference({wkid: 102100}),
          }),
          attributes: feature.attributes,
          popupTemplate: {
            title: 'Address',
            content: '{FULLADDR}, {POSTAL_CITY}',
          },
          symbol: {
            type: "simple-marker",
            color: '#0070FF',
            size: 8,
          },
        });
        const buffer = geometryEngine.geodesicBuffer(
          graphic.geometry, 500, "feet");
        const result = [{
          extent: buffer.extent,
          feature: graphic,
          name: feature.attributes.FULLADDR,
        }];
        console.log("getResults result:", result);
        return result;
      }).catch(err => console.error(err));;
    } else {
      console.log(`searchTerm is an empty string`);
    };
  };

  //********** HOW TO FIRE OFF SEARCH WITHOUT 'ENTER':
  searchWidget.viewModel.watch('selectedSuggestion', suggestion => {
    // console.log("Suggestion changed to:", suggestion, ". searchTerm is:", searchWidget.searchTerm);
    if (suggestion != null) {
      searchWidget.search(suggestion);
      console.log('Search fired from selectedSuggestion watch');
    } else {
      console.warn("Suggestion empty");
    }
  });

  const resultsSection = document.getElementById('resultsSection');
  const resultsDiv = document.getElementById('results');

  searchWidget.on('search-complete', (e) => {
    // console.log('search-complete event fired', e);
    view.popup.close(); // Close any previosuly opened popups
    view.graphics.removeAll(); // Remove any previosuly added graphics
    const searchTermFromSearchbar = e.searchTerm.split(
      ', ')[0].toUpperCase();
    const searchTermFromResult = e.results[0].results[0].name;
    if ((e.numResults !== 0) && (searchTermFromSearchbar === searchTermFromResult)) {
      const searchResult = {
        result: e.results[0].results[0],
        source: e.results[0].source,
        sourceIndex: e.activeSourceIndex,
        target: e.target,
      };
      console.log("The constructed search result is:", searchResult);
      getPollingPlace(searchResult.result.feature)
      .then(pollingPlace => {
        console.log("The polling place is:", pollingPlace);
        const googleMapsUrl = getGoogleMapsUrl(searchResult.result.feature, pollingPlace)
        resultsSection.style.display = 'block';
        resultsDiv.innerHTML = `
          <p class="result-text">
            The polling place for<br/> ${searchResult.result.feature.attributes.FULLADDR}, ${searchResult.result.feature.attributes.POSTAL_CITY} is:<br/>
            <br/>
            <strong>${pollingPlace.attributes.POLL_PL}</strong><br/>
            ${pollingPlace.attributes.ST_NUMBER} ${pollingPlace.attributes.ST_NAME}, ${pollingPlace.attributes.CITY}<br/>
            Precinct ${pollingPlace.attributes.PRECINCT}<br/>
            <br/>
            <a class='directions-link' href='${googleMapsUrl}' target='_blank'>Driving Directions</a>
          </p>
        `;
        const ppBuffer = geometryEngine.geodesicBuffer(
          pollingPlace.geometry, 500, "feet");
        const addressAndPollingPlaceExtent = searchResult.result.extent.union(ppBuffer.extent);
        pollingPlaceFeatureLayer.definitionExpression = `PRECINCT = '${pollingPlace.attributes.PRECINCT}'`;
        view.goTo(addressAndPollingPlaceExtent);
        view.graphics.add(searchResult.result.feature);
        view.popup.open({
          features: [searchResult.result.feature],
          location: searchResult.result.feature.geometry,
          actions: null,
        });
      }).catch(err => console.error(err));;
    } else {
      console.warn(`Search aborted because the searchTermFromSearchbar (${searchTermFromSearchbar}) and searchTermFromResult (${searchTermFromResult}) are not equal.`);
    };
  });

  function getPollingPlace(feature){
    // Takes a feature and returns a promise that resolves a string
    // of HTML of polling place information for the precinct in
    // which the address point falls.
    return new Promise((resolve, reject) => {
      getPrecinct(feature)
      .then(precinct => {
        pollingPlaceFeatureLayer.queryFeatures({
          where: `PRECINCT = '${precinct}'`,
          returnGeometry: true,
          outSpatialReference: 102100,
          outFields: ['PRECINCT', 'POLL_PL',
            'ST_NUMBER', 'ST_NAME', 'CITY'],
        })
        .then(response => resolve(response.features[0]))
        .catch(error => reject(error));
      })
      .catch(error => reject(error));
    });
  };

  function getPrecinct(feature) {
    // Takes a feature and returns a promise that resolves a
    // string of the precinct in which the address point falls
    return new Promise((resolve, reject) => {
      precinctFeatureLayer.queryFeatures({
        geometry: feature.geometry,
        spatialRelationship: 'intersects',
        outFields: ['PRECINCT'],
      })
      .then(response => resolve(response.features[0].attributes.PRECINCT))
      .catch(error => reject(error));
    });
  };

  function getGoogleMapsUrl(fromFeature, toFeature) {
    // Takes two features and returns the google maps url that finds the directions from the first feature to the second feature
    const fromxy = webMercatorUtils.xyToLngLat(fromFeature.geometry.x, fromFeature.geometry.y);
    const toxy = webMercatorUtils.xyToLngLat(toFeature.geometry.x, toFeature.geometry.y);
    return `https://www.google.com/maps/dir/${fromxy[1]},${fromxy[0]}/${toxy[1]},${toxy[0]}`;
  };

  homeWidget.container.addEventListener('click', e => {
    // Clear the search widget when home button is clicked
    searchWidget.clear();
  });

  searchWidget.on('search-clear', (e) => {
    // console.log("Clear search event fired:", e);
    // Remove the resultDiv, reset pollingPlace layer,
    // close popups, remove address graphic, and go to default extent
    resultsSection.style.display = 'none';
    pollingPlaceFeatureLayer.definitionExpression = '';
    view.popup.close();
    view.graphics.removeAll();
    view.goTo(defaultExtent);
  });




// *****************************************************************
// *****************************************************************
  // 8/21/19: NEXT, Add photo carousel of polling place. Also add polling place popup (disable by default though...this is just in case someone clicks). Maybe rewrite getResults and getSuggestions functions to use the addressFeatureLayer instead of going to the rest directory via the fetch api.
// *****************************************************************
// *****************************************************************












// searchWidget.on('select-result', (e) => { // This no longer gets fired since I worked about selecting a result
//   console.log("Select-result event fired:", e);
//   resultsSection.style.display = 'block';
// });

  // searchWidget.on("suggest-complete",(e) => {
  //   if (searchWidget.suggestions != null) {
  //     const filteredSuggestions = searchWidget.suggestions[0].results
  //       .sort((a, b) => a.text.toUpperCase() > b.text.toUpperCase() ? 1 : -1)
  //       .filter(suggestion => suggestion.text.toUpperCase().startsWith(searchWidget.searchTerm.toUpperCase()));
  //     const filteredSuggestionsUnique = [...new Set(filteredSuggestions
  //       .map(suggestion => suggestion.text))]
  //       .map(text => {
  //         return {
  //           text: text,
  //           key: filteredSuggestions.find(s => s.text === text).key,
  //           sourceIndex: 0,
  //         }
  //       });
  //     searchWidget.suggestions[0].results = filteredSuggestionsUnique;
  //     console.log(filteredSuggestions, filteredSuggestionsUnique);
  //  }
  // });


  // view.ui.add(searchWidget, {
  //   position: "top-left",
  //   index: 0
  // });
  //searchWidget.on('select-result', () => view.zoom = 16);

  // ADD Scale Bar //
  // const scaleBarWidget = new ScaleBar({
  //   view: view,
  // });
  // view.ui.add(scaleBarWidget, {
  //   position: "bottom-left",
  //   index: 0
  // });



  // //Different types of search widget events
  // searchWidget.on('search-blur', e => console.log('search-blur', e));
  // searchWidget.on('search-clear', e => console.log('search-clear', e));
  // searchWidget.on('search-complete', e => console.log('search-complete', e));
  // searchWidget.on('search-focus', e => console.log('search-focus', e));
  // searchWidget.on('search-start', e => console.log('search-start', e));
  // searchWidget.on('select-result', e => console.log('select-result', e));
  // searchWidget.on('suggest-complete', e => console.log('suggest-complete', e));
  // searchWidget.on('suggest-start', e => console.log('suggest-start', e));




  // // ADD popup functionality on search //
  // const testingLayer = new FeatureLayer({
  //   url: "https://services1.arcgis.com/a7CWfuGP5ZnLYE7I/ArcGIS/rest/services/WellTestingArea_20190607/FeatureServer/0"
  // });
  // searchWidget.on('select-result', function(evt){
  //   const query = testingLayer.createQuery()
  //   query.geometry = evt.result.feature.geometry;
  //   query.distance = 1;
  //   query.unit = "feet";
  //   query.spatialRelationship = "intersects";
  //
  //   testingLayer.queryFeatures(query).then(function(results){
  //     const popupText = "<p style='font-size:18px; line-height:24px;'>" + results.features[0].attributes.TEXT + "</p>";
  //     view.popup.open({
  //       content: "" + popupText,
  //       location: evt.result.feature.geometry,
  //       actions: null
  //     });
  //   });
  // });

});


const searchHeaderContainer = document.getElementById('searchHeaderContainer');

document.getElementById('voterReg')
  .addEventListener('mouseenter', (e) => {
    if (screen.width < 768) {
      searchHeaderContainer.style.marginTop = '30px';
    }
});

document.getElementById('voterReg')
  .addEventListener('mouseout', (e) => {
    searchHeaderContainer.style.marginTop = '0px';
});


// Image carousel code
function changeImg(){

}
