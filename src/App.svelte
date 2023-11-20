<script>
	// CORE IMPORTS
	import { setContext, onMount } from "svelte";
	import { getMotion } from "./utils.js";
	import { themes } from "./config.js";
	import ONSHeader from "./layout/ONSHeader.svelte";
	import ONSFooter from "./layout/ONSFooter.svelte";
	import Header from "./layout/Header.svelte";
	import Section from "./layout/Section.svelte";
	import Media from "./layout/Media.svelte";
	import Scroller from "./layout/Scroller.svelte";
	import Filler from "./layout/Filler.svelte";
	import Divider from "./layout/Divider.svelte";
	import Toggle from "./ui/Toggle.svelte";
	import Arrow from "./ui/Arrow.svelte";
	import Em from "./ui/Em.svelte";

	// DEMO-SPECIFIC IMPORTS
	import bbox from "@turf/bbox";
	import { getData, setColors, getTopo, getBreaks, getColor } from "./utils.js";
	import { colors, units } from "./config.js";
	import { ScatterChart, LineChart, BarChart } from "@onsvisual/svelte-charts";
	import { Map, MapSource, MapLayer, MapTooltip } from "@onsvisual/svelte-maps";

	// CORE CONFIG (COLOUR THEMES)
	// Set theme globally (options are 'light', 'dark' or 'lightblue')
	let theme = "light";
	setContext("theme", theme);
	setColors(themes, theme);

	// CONFIG FOR SCROLLER COMPONENTS
	// Config
	const threshold = 0.65;
	// State
	let animation = getMotion(); // Set animation preference depending on browser preference
	let id = {}; // Object to hold visible section IDs of Scroller components
	let idPrev = {}; // Object to keep track of previous IDs, to compare for changes
	onMount(() => {
		idPrev = {...id};
	});

	// DEMO-SPECIFIC CONFIG
	// Constants
	const datasets = ["region", "district"];
	const topojson = "./data/geo_mad1.json";
	const mapstyle = "https://raw.githubusercontent.com/ONSvisual/svelte-maps/main/dist/data/style-osm-grey.json" //"https://bothness.github.io/ons-basemaps/data/style-omt.json";
	const mapbounds = {
		uk: [
			[-90, 42 ],
			[ -88, 44 ]
		],
		mad: [
			[-88,40],
			[-90,42]
		]
	};

	// Data
	let data = {district: {}, region: {}};
	let subdata = [];
	let metadata = {district: {}, region: {}};
	let geojson;

	// Element bindings
	let map = null; // Bound to mapbox 'map' instance once initialised

	// State
	let hovered; // Hovered district (chart or map)
	let selected; // Selected district (chart or map)
	$: region = selected && metadata.district.lookup ? metadata.district.lookup[selected].parent : null; // Gets region code for 'selected'
	$: chartHighlighted = metadata.district.array && region ? metadata.district.array.filter(d => d.parent == region).map(d => d.code) : []; // Array of district codes in 'region'
	let mapHighlighted = []; // Highlighted district (map only)
	let xKey = "area"; // xKey for scatter chart
	let yKey = null; // yKey for scatter chart
	let zKey = null; // zKey (color) for scatter chart
	let rKey = null; // rKey (radius) for scatter chart
	let mapKey = "B08201002"; // Key for data to be displayed on map
	let explore = false; // Allows chart/map interactivity to be toggled on/off

	// FUNCTIONS (INCL. SCROLLER ACTIONS)

	// Functions for chart and map on:select and on:hover events
	function doSelect(e) {
		console.log(e);
		selected = e.detail.id;
		if (e.detail.feature) fitById(selected); // Fit map if select event comes from map
	}
	function doHover(e) {
		hovered = e.detail.id;
	}

	// Functions for map component
	function fitBounds(bounds) {
		if (map) {
			map.fitBounds(bounds, {animate: animation, padding: 30});
		}
	}
	function fitById(id) {
		if (geojson && id) {
			// let feature = geojson.features.find(d => d.properties.AREACD == id);
			// let bounds = bbox(feature.geometry);
			// fitBounds(bounds);
		}
	}

	// Actions for Scroller components
	const actions = {
		map: { // Actions for <Scroller/> with id="map"
			map01: () => { // Action for <section/> with data-id="map01"
				fitBounds(mapbounds.uk);
				mapKey = "density";
				mapHighlighted = [];
				explore = false;
			},
			map02: () => {
				fitBounds(mapbounds.uk);
				mapKey = "age_med";
				mapHighlighted = [];
				explore = false;
			},
			map03: () => {
				let hl = [...data.district.indicators].sort((a, b) => b.age_med - a.age_med)[0];
				fitById(hl.code);
				mapKey = "age_med";
				mapHighlighted = [hl.code];
				explore = false;
			},
			map04: () => {
				fitBounds(mapbounds.uk);
				mapKey = "age_med";
				mapHighlighted = [];
				explore = true;
			}
		},
		chart: {
			chart01: () => {
				xKey = "area";
				yKey = null;
				zKey = null;
				rKey = null;
				explore = false;
			},
			chart02: () => {
				xKey = "area";
				yKey = null;
				zKey = null;
				rKey = "pop";
				explore = false;
			},
			chart03: () => {
				xKey = "area";
				yKey = "density";
				zKey = null;
				rKey = "pop";
				explore = false;
			},
			chart04: () => {
				xKey = "area";
				yKey = "density";
				zKey = "parent_name";
				rKey = "pop";
				explore = false;
			},
			chart05: () => {
				xKey = "area";
				yKey = "density";
				zKey = null;
				rKey = "pop";
				explore = true;
			}
		}
	};

	// Code to run Scroller actions when new caption IDs come into view
	function runActions(codes = []) {
		codes.forEach(code => {
			if (id[code] != idPrev[code]) {
				if (actions[code][id[code]]) {
					actions[code][id[code]]();
				}
				idPrev[code] = id[code];
			}
		});
	}
	$: id && runActions(Object.keys(actions)); // Run above code when 'id' object changes

	// INITIALISATION CODE
	datasets.forEach(geo => {
		getData(`./data/data_${geo}.csv`)
		.then(arr => {
			let meta = arr.map(d => ({
				code: d.code,
				name: d.name,
				parent: d.parent ? d.parent : null
			}));
			let lookup = {};
			meta.forEach(d => {
				lookup[d.code] = d;
			});
			metadata[geo].array = meta;
			metadata[geo].lookup = lookup;

			let indicators = arr.map((d, i) => ({
				...meta[i],
				area: d.area,
				pop: d['2020'],
				density: d.density,
				age_med: d.age_med
			}));

			if (geo == "district") {
				['density', 'age_med'].forEach(key => {
					let values = indicators.map(d => d[key]).sort((a, b) => a - b);
					let breaks = getBreaks(values);
					indicators.forEach((d, i) => indicators[i][key + '_color'] = getColor(d[key], breaks, colors.seq));
				});
			}
			data[geo].indicators = indicators;

			let years = [
				2001, 2002, 2003, 2004, 2005,
				2006, 2007, 2008, 2009, 2010,
				2011, 2012, 2013, 2014, 2015,
				2016, 2017, 2018, 2019, 2020
			];

			let timeseries = [];
			arr.forEach(d => {
				years.forEach(year => {
					timeseries.push({
						code: d.code,
						name: d.name,
						value: d[year],
						year
					});
				});
			});
			data[geo].timeseries = timeseries;	
		});
	});
	
	getTopo(topojson)
	.then(geo => {
		// geo.features.sort((a, b) => a.properties.AREANM.localeCompare(b.properties.AREANM));
		
		geojson = geo;
		console.log(geojson['features'])
		let vals = geojson['features'].map(d => d.properties['B08201001']).sort((a, b) => a - b);
		let len = vals.length;
		let breaks = [
			vals[0],
			vals[Math.floor(len * 0.2)],
			vals[Math.floor(len * 0.4)],
			vals[Math.floor(len * 0.6)],
			vals[Math.floor(len * 0.8)],
			vals[len - 1]
		];
		console.log(breaks)
		console.log(vals)
		geojson['features'].forEach(d => {
			subdata.push({'geoid':d.properties.geoid,
						  'color': getColor(d.properties['B08201001'], breaks, colors.seq5)})
		});
		console.log(subdata)
		
	});
</script>

<ONSHeader filled={true} center={false} />

<Header bgimage="./img/bg-image3.jpg" bgfixed={true} theme="light" center={false} short={true}>
	<h1>Bringing Better Carshare to Madison	</h1>
	<p class="text-big" style="margin-top: 25px; background-color:rgba(204, 204, 204, 0.5);padding:1%;" >
		We're building a new carshare solution, so you can get where you're going, spend half as much on driving, and help make our city a more walkable, human-friendly place to live.
	</p>
	<!-- <p style="margin-top: 20px">
		DD MMM YYYY
	</p> -->
	<!-- <p>
		<Toggle label="Animation {animation ? 'on' : 'off'}" mono={true} bind:checked={animation}/>
	</p> -->
	<div style="margin-top: 40px; text-align:center;">
		<a href="#start">
			<Arrow color="white" {animation}><span style="background-color:rgba(204, 204, 204, 0.5);padding:5px;">Learn more</span></Arrow>
		</a>
	</div>
</Header>

<!-- <Filler theme="lightblue" short={true} wide={true} center={false}>
	<p class="text-big">
		This is a large, left-aligned text caption
	</p>
</Filler> -->

<Section>
	<h2 id="start">Save Money, Help Build a Better City</h2>
	<p>
		The average car owner spends <a href="https://www.moneygeek.com/insurance/auto/analysis/costs-of-car-ownership/">$10,000</a> per year.  And the typical car is sitting parked <a href="https://usa.streetsblog.org/2016/03/10/its-true-the-typical-car-is-parked-95-percent-of-the-time">95%</a> of the time.
	</p>
	<p>
		We want to bring all the 
	</p>
	<blockquote class="text-indent">
		"The automobile city is the anti-city that annihilates the city wherever it collides with it."&mdash;Lewis Mumford, The City in History
	</blockquote>
</Section>

<Divider/>


<Section>
	<h2>Why Madison, Why Now?</h2>
	<p>
		We recently surveyed Madison neighbors and found that they are ready to take action to change our city, and save time and money doing it.
	</p>
</Section>

<Scroller {threshold} bind:id={id['chart']} splitscreen={true}>
	<div slot="background">
		<figure>
			<div class="col-wide height-full">
				{#if data.district.indicators && metadata.region.lookup}
					<div class="chart">
						<ScatterChart
							height="calc(100vh - 150px)"
							data={data.district.indicators.map(d => ({...d, parent_name: metadata.region.lookup[d.parent].name}))}
							colors={explore ? ['lightgrey'] : colors.cat}
							{xKey} {yKey} {zKey} {rKey} idKey="code" labelKey="name"
							r={[3,10]}
							xScale="log"
							xTicks={[10, 100, 1000, 10000]} xFormatTick={d => d.toLocaleString()}
							xSuffix=" sq.km"
							yFormatTick={d => d.toLocaleString()}
							legend={zKey != null} labels
							select={explore} selected={explore ? selected : null} on:select={doSelect}
							hover {hovered} on:hover={doHover}
							highlighted={explore ? chartHighlighted : []}
							colorSelect="#206095" colorHighlight="#999" overlayFill
							{animation}/>
					</div>
				{/if}
			</div>
		</figure>
	</div>

	<div slot="foreground">
		<section data-id="chart01">
			<div class="col-medium">
				<p>
					This chart shows the <strong>area in square kilometres</strong> of each local authority district in the UK. Each circle represents one district. The scale is logarithmic.
				</p>
			</div>
		</section>
		<section data-id="chart02">
			<div class="col-medium">
				<p>
					The radius of each circle shows the <strong>total population</strong> of the district.
				</p>
			</div>
		</section>
		<section data-id="chart03">
			<div class="col-medium">
				<p>
					The vertical axis shows the <strong>density</strong> of the district in people per hectare.
				</p>
			</div>
		</section>
		<section data-id="chart04">
			<div class="col-medium">
				<p>
					The colour of each circle shows the <strong>part of the country</strong> that the district is within.
				</p>
			</div>
		</section>
		<section data-id="chart05">
			<div class="col-medium">
				<h3>Select a district</h3>
				<p>Use the selection box below or click on the chart to select a district. The chart will also highlight the other districts in the same part of the country.</p>
				{#if geojson}
					<p>
						<!-- svelte-ignore a11y-no-onchange -->
						<select bind:value={selected}>
							<option value={null}>Select one</option>
							{#each geojson.features as place}
								<option value={place.properties.AREACD}>
									{place.properties.AREANM}
								</option>
							{/each}
						</select>
					</p>
				{/if}
			</div>
		</section>
	</div>
</Scroller>

<Divider />


<Section>
	<h2>Our Vision</h2>
	<p>
		What does this look like in our city.
	</p>
</Section>

{#if geojson && data.district.indicators}
<Scroller {threshold} bind:id={id['map']}>
	<div slot="background">
		<figure>
			<div class="col-full height-full">  
				<!-- location={{bounds: [[-89.75, 42.95],[-89, 43.2 ]]} -->
				<Map id="map1" style={mapstyle} bind:map interactive={false} zoom={13} center={[-89.45, 43.1]}>
					<MapSource
					  id="lad"
					  type="geojson"
					  data={geojson}
					  promoteId="geoid"
					  maxzoom={13}>
					  <MapLayer
					  	id="lad-fill"
						idKey="geoid"
						colorKey="color"
					  	data={subdata}
					  	type="fill"
						select {selected} on:select={doSelect} clickIgnore={!explore}
						hover {hovered} on:hover={doHover}
						highlight highlighted={mapHighlighted}
						paint={{
							'fill-color':  ['feature-state', 'color'],
							'fill-opacity': 0.7
						}}
					  	>
								<!-- <MapTooltip content={
									hovered ? `${metadata.district.lookup[hovered].name}<br/><strong>${data.district.indicators.find(d => d.code == hovered)[mapKey].toLocaleString()} ${units[mapKey]}</strong>` : ''
								}/> -->
							</MapLayer>
				  </MapSource>
				</Map>
			</div>
		</figure>
	</div>

	<div slot="foreground">
		<section data-id="map01">
			<div class="col-medium">
				<p>
					This map shows <strong>population density</strong> by district. Districts are coloured from <Em color={colors.seq[0]}>least dense</Em> to <Em color={colors.seq[4]}>most dense</Em>. You can hover to see the district name and density.
				</p>
			</div>
		</section>
		<section data-id="map02">
			<div class="col-medium">
				<p>
					The map now shows <strong>median age</strong>, from <Em color={colors.seq[0]}>youngest</Em> to <Em color={colors.seq[4]}>oldest</Em>.
				</p>
			</div>
		</section>
		<section data-id="map03">
			<div class="col-medium">
				<!-- This gets the data object for the district with the oldest median age -->
				{#each [[...data.district.indicators].sort((a, b) => b.age_med - a.age_med)[0]] as district}
				<p>
					The map is now zoomed on <Em color={district.age_med_color}>{district.name}</Em>, the district with the oldest median age, {district.age_med} years.
				</p>
				{/each}
			</div>
		</section>
		<section data-id="map04">
			<div class="col-medium">
				<h3>Select a district</h3>
				<p>Use the selection box below or click on the map to select and zoom to a district.</p>
				{#if geojson}
					<p>
						<!-- svelte-ignore a11y-no-onchange -->
						<select bind:value={selected} on:change={() => fitById(selected)}>
							<option value={null}>Select one</option>
							{#each geojson.features as place}
								<option value={place.properties.AREACD}>
									{place.properties.AREANM}
								</option>
							{/each}
						</select>
					</p>
				{/if}
			</div>
		</section>
	</div>
</Scroller>
{/if}


<Divider />

<Section>
	<h2>The nitty gritty details</h2>
	<p>
		Here we include lots of details about how insurance and pricing work, how and where we are rolling this out in Tenney Lapham in 2024, and why you should get in touch.
	</p>
</Section>

<ONSFooter />

<style>
	/* Styles specific to elements within the demo */
	:global(svelte-scroller-foreground) {
		pointer-events: none !important;
	}
	:global(svelte-scroller-foreground section div) {
		pointer-events: all !important;
	}
	select {
		max-width: 350px;
	}
	.chart {
		margin-top: 45px;
		width: calc(100% - 5px);
	}
	.chart-full {
		margin: 0 20px;
	}
	.chart-sml {
		font-size: 0.85em;
	}
	/* The properties below make the media DIVs grey, for visual purposes in demo */
	.media {
		background-color: #f0f0f0;
		display: -webkit-box;
		display: -ms-flexbox;
		display: flex;
		-webkit-box-orient: vertical;
		-webkit-box-direction: normal;
		-ms-flex-flow: column;
		flex-flow: column;
		-webkit-box-pack: center;
		-ms-flex-pack: center;
		justify-content: center;
		text-align: center;
		color: #aaa;
	}
</style>
