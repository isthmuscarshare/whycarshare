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

    // Autocomplete functionality
    // -----------------------------------------------------//
    class AutocompleteDirectionsHandler {
      map;
      originPlaceId;
      destinationPlaceId;
      travelMode;
      directionsService;
      directionsRenderer;
      constructor(map) {
        this.map = map;
        this.originPlaceId = "";
        this.destinationPlaceId = "";
        this.travelMode = google.maps.TravelMode.DRIVING;
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer();
        this.directionsRenderer.setMap(map);
    
        const originInput = document.getElementById("origin-input");
        const destinationInput = document.getElementById("destination-input");
        // const modeSelector = document.getElementById("mode-selector");
        // Specify just the place data fields that you need.
        const originAutocomplete = new google.maps.places.Autocomplete(
          originInput,
          { fields: ["place_id"] },
        );
        // Specify just the place data fields that you need.
        const destinationAutocomplete = new google.maps.places.Autocomplete(
          destinationInput,
          { fields: ["place_id"] },
        );
    
        // this.setupClickListener(
        //   "changemode-walking",
        //   google.maps.TravelMode.WALKING,
        // );
        // this.setupClickListener(
        //   "changemode-transit",
        //   google.maps.TravelMode.TRANSIT,
        // );
        // this.setupClickListener(
        //   "changemode-driving",
        //   google.maps.TravelMode.DRIVING,
        // );
        this.setupPlaceChangedListener(originAutocomplete, "ORIG");
        this.setupPlaceChangedListener(destinationAutocomplete, "DEST");
        this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(originInput);
        this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
          destinationInput,
        );
        // this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(modeSelector);
      }
      // Sets a listener on a radio button to change the filter type on Places
      // Autocomplete.
      // setupClickListener(id, mode) {
      //   const radioButton = document.getElementById(id);
    
      //   radioButton.addEventListener("click", () => {
      //     this.travelMode = mode;
      //     this.route();
      //   });
      // }
      setupPlaceChangedListener(autocomplete, mode) {
        autocomplete.bindTo("bounds", this.map);
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
    
          if (!place.place_id) {
            window.alert("Please select an option from the dropdown list.");
            return;
          }
    
          if (mode === "ORIG") {
            this.originPlaceId = place.place_id;
          } else {
            this.destinationPlaceId = place.place_id;
          }
    
          this.route();
        });
      }
      route() {
        if (!this.originPlaceId || !this.destinationPlaceId) {
          return;
        }
    
        const me = this;
    
        this.directionsService.route(
          {
            origin: { placeId: this.originPlaceId },
            destination: { placeId: this.destinationPlaceId },
            travelMode: this.travelMode,
          },
          (response, status) => {
            if (status === "OK") {
              me.directionsRenderer.setDirections(response);
            } else {
              window.alert("Directions request failed due to " + status);
            }
          },
        );
      }
    }


    // End autocomplete
    // -----------------------------------------------------//

    // hard-coded request

    const origin1 = "2614 St Paul Ave, Madison, WI 53704"
    const destinationA = "Costco, Middleton, WI"; // round trip

    const meters_to_mile = 0.000621371;
    const seconds_to_hour = 0.000277778; 

    const cost_per_mile = 1.5;
    const cost_per_hour = 3.0;

    const cost_per_mile_zip = 2.5;
    const cost_per_hour_zip = 12.0;

    
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

      // Add custom slider for how long the user wants to stay at a destination
      var slider = document.getElementById("myRange");
      var output = document.getElementById("duration_slider");
      var estimated_cost = document.getElementById("travelstats");

      // Calculate travel time and distance, multiplying by 2 to make it a round trip
      var travel_time = 2.0*response.rows[0].elements[0].duration.value * seconds_to_hour;
      var travel_distance = 2.0*response.rows[0].elements[0].distance.value * meters_to_mile;

      output.innerHTML = slider.value;

      slider.oninput = function() {
        // print value below slider
        output.innerHTML = this.value;

        // Calculate cost as minimum of time and distance-based estimate, adding an hour for shopping, etc.
        var cost = Math.min((slider.value/60.0 + travel_time)*cost_per_hour, travel_distance*cost_per_mile);
        var cost_zip = Math.min((slider.value/60.0 + travel_time)*cost_per_hour_zip, travel_distance*cost_per_mile_zip);

        estimated_cost.innerHTML = "Factoring in a travel time of " + String(travel_time.toFixed(2)) + " hours" + "<br>" 
        + "and driving distance of " + String(travel_distance.toFixed(2)) + " miles..." + "<br>"
        + "<br>"
        + "Cost with Down the Block: $" + String(cost.toFixed(2)) + "<br>"
        + "Cost with ZipCar: $" + String(cost_zip.toFixed(2));
      }


      


      // document.getElementById("travelstats").innerText = JSON.stringify(response.rows[0].elements[0].distance.value * meters_to_mile * cost_per_mile)
      // document.getElementById("travelstats").innerText = JSON.stringify(travel_time * cost_per_hour)
     
  
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


