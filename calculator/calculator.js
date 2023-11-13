/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck TODO remove when fixed


let map;

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");
    const bounds = new google.maps.LatLngBounds();
    const markersArray = [];
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 43.073051, lng: -89.401230 },
      zoom: 10,
    });
    // initialize services
    const geocoder = new google.maps.Geocoder();
    const service = new google.maps.DistanceMatrixService();
    // build request
    //const origin1 = { lat: 43.073051, lng: -3.118 };
    const origin1 = "2614 St Paul Ave, Madison, WI 53704"
    // const origin2 = "Costco, Sun Prairie, WI";
    const destinationA = "Costco, Middleton, WI"; // round trip
    // const destinationB = origin1; // round trip
    const request = {
      //origins: [origin1, origin2],
      origins: [origin1],
      // destinations: [destinationA, destinationB],
      destinations: [destinationA],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false,
    };
  
    // put request on page
    document.getElementById("request").innerText = JSON.stringify(
      request,
      null,
      2,
    );
    // get distance matrix response
    service.getDistanceMatrix(request).then((response) => {
      // put response
      document.getElementById("response").innerText = JSON.stringify(
        response,
        null,
        2,
      );
      
      //document.getElementById("response").innerText = 89;
  
      // show on map
      const originList = response.originAddresses;
      const destinationList = response.destinationAddresses;
  
      deleteMarkers(markersArray);
  
      const showGeocodedAddressOnMap = (asDestination) => {
        const handler = ({ results }) => {
          map.fitBounds(bounds.extend(results[0].geometry.location));
          markersArray.push(
            new google.maps.Marker({
              map,
              position: results[0].geometry.location,
              label: asDestination ? "D" : "O",
            }),
          );
        };
        return handler;
      };
  
      for (let i = 0; i < originList.length; i++) {
        const results = response.rows[i].elements;
  
        geocoder
          .geocode({ address: originList[i] })
          .then(showGeocodedAddressOnMap(false));
  
        for (let j = 0; j < results.length; j++) {
          geocoder
            .geocode({ address: destinationList[j] })
            .then(showGeocodedAddressOnMap(true));
        }
      }
    });
  }
  
  
  function deleteMarkers(markersArray) {
    for (let i = 0; i < markersArray.length; i++) {
      markersArray[i].setMap(null);
    }
  
    markersArray = [];
  }
  
  window.onload = initMap;


