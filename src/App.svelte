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
			[-89.45, 43.0 ],
			[ -89.35, 43.15 ]
		],
		mad: [
			[-88,40],
			[-90,42]
		]
	};

	// Data
	let linechart = {}
	let data = {district: {}, region: {}};
	let subdata = [];
	let metadata = {district: {}, region: {}};
	let geojson;

	let words1 = [
	{ text: "maintenance", count: 12 },
	{ text: "parking", count: 12 },
	{ text: "cost", count: 11 },
	{ text: "driving", count: 5 },
	{ text: "emissions", count: 3 },
	{ text: "pollution", count: 3 },
	{ text: "drivers", count: 2 },
	{ text: "guilt", count: 2 },
	{ text: "insurance", count: 2 },
	{ text: "environmental", count: 2 },
	{ text: "space", count: 2 },
	{ text: "expense", count: 2 },
	{ text: "street", count: 2 },
	];

	let words2 = [
	{ text: "maintenance", count: 12 },
	{ text: "parking", count: 12 },
	{ text: "cost", count: 11 },
	{ text: "driving", count: 5 },
	];

	let start_year = 2024
	let years = 10
	let new_car_price = 48000
	let used_car_price = 34000
	let car_cpm = 0.5
	let zipcar_memb = 50
	let zipcar_cpm = 1
	let downtheblock_memb = 500
	let downtheblock_cpm = 0.75
	let selected_chart

	function generate_cost_data(start_year, years, miles_per_year, new_car_price, car_cost_per_mile, zipcar_membership, zipcar_cost_per_mile, downtheblock_membership, downtheblock_cost_per_mile) {
		let ret = []
		for (let i=0; i < years; i ++){
			ret.push({year: start_year+i, value: new_car_price+(i+1)*miles_per_year*car_cost_per_mile, group: 'Owning Car'})
		}
		
		// for (let i=0; i < years; i ++){
		// 	ret.push({year: start_year+i, value: used_car_price+(i+1)*miles_per_year*car_cost_per_mile, group: 'used car price'})
		// }
	
		for (let i=0; i < years; i ++){
			ret.push({year: start_year+i, value: (i+1)*(zipcar_membership+miles_per_year*zipcar_cost_per_mile), group: 'Zipcar'})
		}
	
		for (let i=0; i < years; i ++){
			ret.push({year: start_year+i, value: downtheblock_membership+ (i+1)*(miles_per_year*downtheblock_cost_per_mile), group: 'Isthmus Carshare'})
		}
		return ret
	}

	let mileage_choices = [{'ind':0,'val':1000}, {'ind':1,'val':5000}, {'ind':2,'val':10000}]
	let mydata = []
	for (let m in mileage_choices){
		mydata.push(generate_cost_data(start_year,years,mileage_choices[m].val,new_car_price,car_cpm,zipcar_memb,zipcar_cpm,downtheblock_memb,downtheblock_cpm))
	}
	let mileage_selected = 1

	// let eco_data = [{mode: 'car',value: 18},{mode:'carshare',value: 15}]

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

	let image_image = "./img/utopia2.jpg"
	let image_opacity = 1

	let words = words1

	// FUNCTIONS (INCL. SCROLLER ACTIONS)

	// Functions for chart and map on:select and on:hover events
	function doSelect(e) {
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
				selected_chart = null;
			},
			chart02: () => {
				selected_chart="New Car";
			},
			chart03: () => {
				selected_chart="Isthmus Carshare";
			},
			chart04: () => {
				selected_chart = null;
			},
			chart05: () => {
				selected_chart = null;
			}
		},
		image: { // Actions for <Scroller/> with id="map"
			image01: () => {
				image_opacity = 1
			},
			image02: () => {
				image_opacity = 0
			}
		},
		words: { // Actions for <Scroller/> with id="map"
			words01: () => {
				words = words1
			},
			words02: () => {
				words = words2
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
		geojson['features'].forEach(d => {
			subdata.push({'geoid':d.properties.geoid,
						  'color': getColor(d.properties['B08201001'], breaks, colors.seq5)})
		});
		
	});

import WordCloud from "svelte-d3-cloud";



</script>


<ONSHeader filled={true} center={false} />

<Header bgimage="./img/bg-image4.jpg" bgfixed={true} theme="light" center={false} short={true}>
	<h1>Bringing Better Carshare to Madison	</h1>
	<p class="text-big" style="margin-top: 25px; background-color:rgba(204, 204, 204, 0.9);padding:1%;" >
		We're building a new carshare solution so you can <a href="#start">save money</a>, help <a href="#city">build a better city</a>, and <a href="#environment">protect the environment</a>, while getting where you need to go each day.
	</p>
	<!-- <p style="margin-top: 20px">
		DD MMM YYYY
	</p> -->
	<!-- <p>
		<Toggle label="Animation {animation ? 'on' : 'off'}" mono={true} bind:checked={animation}/>
	</p> -->
	<div style="margin-top: 40px; text-align:center;">
		
			<Arrow color="white" {animation}>
				<a href="#start"><span style="background-color:rgba(204, 204, 204, 0.9);padding:5px;">Why carshare?</span></a>
				<a href="#signup"><span style="background-color:rgba(204, 204, 204, 0.9);padding:5px;">Sign up</span></a>
			</Arrow>
		
		
	</div>
</Header>

<!-- <Filler theme="lightblue" short={true} wide={true} center={false}>
	<p class="text-big">
		This is a large, left-aligned text caption
	</p>
</Filler> -->

<Section>
	<h2 id="start">Why Carshare?</h2>
	<h3> Save Money</h3>
	<p>
		The average car owner spends $10,000 per year on their car<a href="https://www.moneygeek.com/insurance/auto/analysis/costs-of-car-ownership/"><sup>[1]</sup></a>.  And the typical car is sitting parked 95% of the time<a href="https://usa.streetsblog.org/2016/03/10/its-true-the-typical-car-is-parked-95-percent-of-the-time"><sup>[2]</sup></a>.
	</p>
	<p>
		We're building a local-focused carshare program that will lower the cost of transportation for our members.
	</p>
</Section>

<Divider/>

<Scroller {threshold} bind:id={id['chart']} splitscreen={true}>
	<div slot="background">
		<figure>
			<div class="col-wide">
				<div class="chart">
					<LineChart
						height="calc(100vh - 300px)"
						bind:data={mydata[mileage_selected]}
						xKey="year" yKey="value" zKey="group"
						colors={colors.seq5}
						yFormatTick={d=>'$'+d/1000 + 'k'}
						line={true} area={false} areaOpacity={0.3}
						title="Cost of owning your own car vs using carshare"
						footer={"estimated from 2023 average prices, assuming "+mileage_choices[mileage_selected].val+" miles/year of travel"}
						legend={true}
						{animation} labels
						hover={true} select={false}
						bind:selected={selected_chart}
						snapTicks={false}>
						<!-- <div slot="options" class="controls small">
							$ <label class="switch"> <input type="checkbox" bind:checked={linechart.line}/> <span class="slider round"></span> </label> CO2
						</div> -->
					</LineChart>
				</div>
			</div>
		</figure>
	</div>

	<div slot="foreground">
		<section data-id="chart01">
			<div class="col-medium">
				<p>
					This chart shows the <strong>expected cost</strong> of our carshare program compared to owning your own car and the leading carshare competitor, Zipcar.
				</p>
			</div>
		</section>
		<section data-id="chart02">
			<div class="col-medium">
				<p>
					As you can see, owning your own car adds up to a cost of nearly $70k after 10 years.
				</p>
			</div>
		</section>
		<section data-id="chart03">
			<div class="col-medium">
				<p>
					Meanwhile, our offering at Isthmus Carshare is substantially cheaper.
				</p>
			</div>
		</section>
		<section data-id="chart05">
			<div class="col-medium">
				<h3>Choose your mileage</h3>
				<p>Use the selection box below to select your average mileage and see how your costs will compare.</p>
					<p>
						<!-- svelte-ignore a11y-no-onchange -->
						<select bind:value={mileage_selected}>
							{#each mileage_choices as m}
								<option value={m.ind}>
									{m.val}
								</option>
							{/each}
						</select>
					</p>
			</div>
		</section>
	</div>
</Scroller>

<Divider/>

<Section>
	<h2 id="city">Why Carshare?</h2>
	<h4> Build a Better City</h4>
	<blockquote class="text-indent">
		"I believe Madison is ready to accelerate climate action for the benefit of our community and our world."&mdash;Mayor Satya Rhodes-Conway
	</blockquote>
</Section>

<Scroller {threshold} bind:id={id['image']}>
	<div slot="background">
		<div class="col-full height-full image-container">
			<img alt="images of Madison's new plans for Law Park and Monona Terrace." src={image_image} style="width:100%; height:100vh; transition: all .3s ease-in-out; opacity:{image_opacity};"/>
		</div>
	</div>

	<div slot="foreground">
		<section data-id="image01">
			<div class="col-medium">
				<p>
					Madison has set ambitious goals for increasing our sustainability and our resilience for a future of climate change.  We've chosen bold ideas like these from <a href="https://fox47.com/news/local/results-of-lake-monona-waterfront-survey-shows-slight-preference-for-bold-redesign">Lake Monona's Waterfront Redesign Survey</a>.
				</p>
			</div>
		</section>
		<section data-id="image02">
			<div class="col-medium">
				<p>
					As part of that future, we are dedicated to revamping our city's infrastructure. But we can't do that without significant change to our assumptions about what it means to get around Madison.
				</p>
			</div>
		</section>
		<section data-id="image03">
			<div class="col-medium">
				<p>
					Switching to carshare helps makes alternatives like transit and cycling more appealing and frees up parking space in our city for gardens, housing, and countless amenities.
				</p>
			</div>
		</section>
	</div>
</Scroller>

<Divider/>

<Section>
	<h2 id="environment">Why Carshare?</h2>
	<h3> Protect the Environment</h3>
	<blockquote class="text-indent">
		"Car sharers emit between <strong>8%</strong> and <strong>13%</strong> less CO2 per person, per year. About half of this reduction can be
		ascribed to less car use; the other half to the lower degree of car ownership."&mdash;Nijlin et al. 2015
	</blockquote>
	<!-- <BarChart
			  data={eco_data}
				xKey="value" yKey="mode"
				title="Greenhouse gas emissions effects from switching to carshare"
				footer="Source: ."
				{animation}>
			</BarChart> -->
</Section>

<Divider/>


<Section>
	
	<h2>Madison is Ready!</h2>
	<p>
		We recently surveyed our Madison neighbors and found that they are ready to take action and change the way we are dependent on cars to get around.
	</p>
	<figure class="myfigure">
		<div class="col-wide" style="width:98%;">
			<div class="chart" style='margin-left:50px;overflow:scroll'>
				<WordCloud bind:words={words} width=500 height=250 maxFontSize=13 padding=1/>
			</div>
		</div>
		<figcaption>Responses for what neighbors liked least about owning their cars.</figcaption>
	</figure>
	<p>
		Our service offers all the convenience of a car, with none of the cost, maintenance, parking or environmental guilt.
	</p>
	
</Section>




<Divider />


<Section>
	<h2>Getting around with Isthmus Carshare</h2>
	<p>
		We plan to roll out our offering to a selection of targeted neighborhoods throughout the city, 
		beginning Spring 2024 with the Tenney-Lapham neighborhood. Play around with the cost estimator tool below to 
		imagine common trips you would take and see how our price plan compares to others!
	</p>
</Section>
<Divider />

<div >
	<figure>
		<div class="col-full height-full">  
			<iframe src="https://stedn.github.io/down-the-block/map_route_popups/map_route_popups.html" onload="this.width=screen.width;this.height=0.8*screen.height;"></iframe>
		</div>
	</figure>
</div>
<Scroller {threshold} bind:id={id['map']}>
	

	<!-- <div slot="foreground">
		<section data-id="map01">
			<div class="col-medium">
				<p>
					This map shows the neighborhoods we want to rollout in, compared to the limited availability of Zipcar.
				</p>
			</div>
		</section>
		<section data-id="map02">
			<div class="col-medium">
				<p>
					We're looking to 
				</p>
			</div>
		</section>
		
	</div> -->
</Scroller>


<Divider />

<Section>
	<h2 id="signup">Help us</h2>
	<p>
		We're working to make this future a possibility today!  You can help by taking a <a href="https://forms.gle/p8iJkaLSgSe5JEmA7">brief survey</a> to inform our site location plans, or you can sign up to our mailing list to receive updates when we roll out.
	</p>
	<div id="mc_embed_shell">
		<link href="//cdn-images.mailchimp.com/embedcode/classic-061523.css" rel="stylesheet" type="text/css">
	<style type="text/css">
		  #mc_embed_signup{background:#fff; false;clear:left; font:14px Helvetica,Arial,sans-serif; width: 600px;}
		  /* Add your own Mailchimp form style overrides in your site stylesheet or in this style block.
			 We recommend moving this block and the preceding CSS link to the HEAD of your HTML file. */
  </style>
  <div id="mc_embed_signup">
	  <form action="https://gmail.us10.list-manage.com/subscribe/post?u=e9495ad37d9ef1320b4e92a08&amp;id=fece0ca4d6&amp;f_id=0080d0e5f0" method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form" class="validate" target="_blank">
		  <div id="mc_embed_signup_scroll">
			  <div class="indicates-required"><span class="asterisk">*</span> indicates required</div>
			  <div class="mc-field-group"><label for="mce-EMAIL">Email Address <span class="asterisk">*</span></label><input type="email" name="EMAIL" class="required email" id="mce-EMAIL" required="" value=""></div>
		  <div id="mce-responses" class="clear foot">
			  <div class="response" id="mce-error-response" style="display: none;"></div>
			  <div class="response" id="mce-success-response" style="display: none;"></div>
		  </div>
	  <div style="position: absolute; left: -5000px;" aria-hidden="true">
		  /* real people should not fill this in and expect good things - do not remove this or risk form bot signups */
		  <input type="text" name="b_e9495ad37d9ef1320b4e92a08_fece0ca4d6" tabindex="-1" value="">
	  </div>
		  <div class="optionalParent">
			  <div class="clear foot">
				  <input type="submit" name="subscribe" id="mc-embedded-subscribe" class="button" value="Subscribe">
				  <!-- <p style="margin: 0px auto;"><a href="http://eepurl.com/iF1sSE" title="Mailchimp - email marketing made easy and fun"><span style="display: inline-block; background-color: transparent; border-radius: 4px;"><img class="refferal_badge" src="https://digitalasset.intuit.com/render/content/dam/intuit/mc-fe/en_us/images/intuit-mc-rewards-text-dark.svg" alt="Intuit Mailchimp" style="width: 220px; height: 40px; display: flex; padding: 2px 0px; justify-content: center; align-items: center;"></span></a></p> -->
			  </div>
		  </div>
	  </div>
  </form>
  </div>
  <!-- <script type="text/javascript" src="//s3.amazonaws.com/downloads.mailchimp.com/js/mc-validate.js"></script><script type="text/javascript">(function($) {window.fnames = new Array(); window.ftypes = new Array();fnames[0]='EMAIL';ftypes[0]='email';fnames[1]='FNAME';ftypes[1]='text';fnames[2]='LNAME';ftypes[2]='text';fnames[3]='ADDRESS';ftypes[3]='address';fnames[4]='PHONE';ftypes[4]='phone';fnames[5]='BIRTHDAY';ftypes[5]='birthday';}(jQuery));var $mcj = jQuery.noConflict(true);</script></div> -->
  
	<p>
		For other inquiries or if you are interested in helping out, you can email us at <a href="mailto:madison.carshare@gmail.com">madison.carshare@gmail.com</a>.
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
		width: calc(80%);
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

	.switch {
	position: relative;
	display: inline-block;
	width: 60px;
	height: 34px;
	}

	/* Hide default HTML checkbox */
	.switch input {
	opacity: 0;
	width: 0;
	height: 0;
	}

	/* The slider */
	.slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #ccc;
	-webkit-transition: .4s;
	transition: .4s;
	}

	.slider:before {
	position: absolute;
	content: "";
	height: 26px;
	width: 26px;
	left: 4px;
	bottom: 4px;
	background-color: white;
	-webkit-transition: .4s;
	transition: .4s;
	}

	input:checked + .slider {
	background-color: #2196F3;
	}

	input:focus + .slider {
	box-shadow: 0 0 1px #2196F3;
	}

	input:checked + .slider:before {
	-webkit-transform: translateX(26px);
	-ms-transform: translateX(26px);
	transform: translateX(26px);
	}

	/* Rounded sliders */
	.slider.round {
	border-radius: 34px;
	}

	.slider.round:before {
	border-radius: 50%;
	}

	.image-container {
	background: url(https://stedn.github.io/down-the-block/public/img/utopia1.jpg) center center no-repeat;
	background-size: 100% 100vh;
	
	-webkit-transition: all .3s ease-in-out;
	-moz-transition: all .3s ease-in-out;
	transition: all .3s ease-in-out;
	}

	.myfigure {
	border: thin #c0c0c0 solid;
	display: flex;
	flex-flow: column;
	padding: 5px;
	margin: auto;
	}

	.myfigure figcaption {
	background-color: #222;
	color: #fff;
	font: italic smaller sans-serif;
	padding: 3px;
	text-align: center;
	}
</style>
