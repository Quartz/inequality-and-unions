// NPM modules
var _ = {};
_.assign = require('lodash.assign');

var d3 = _.assign({},
	require("d3-selection"),
	require("d3-request"),
	require("d3-scale"),
	require("d3-axis"),
	require("d3-shape"),
	require("d3-array"),
	require("d3-format"),
	require("d3-time-format")
);

d3.getEvent = function(){ return require("d3-selection").event}.bind(this);


// Local modules
var features = require('./detectFeatures')();
var fm = require('./fm');
var utils = require('./utils');

// Globals
var DEFAULT_WIDTH = 940;
var MOBILE_BREAKPOINT = 600;

var LABEL_DEFAULTS = {
	'text-anchor': 'middle',
	'font-size': 0.8,
	'rotate': 0
};

var LABELS = [
	{
		'country': 'Iceland',
		'gini': 32,
		'pct_unionized': 77.5,
		'text-anchor': 'end'
	},
	{
		'country': 'Chile',
		'gini': 46.5,
		'pct_unionized': 16,
		'text-anchor': 'start'
	},
	{
		'country': 'USA',
		'gini': 39.2,
		'pct_unionized': 11.75,
		'text-anchor': 'start'
	}
];

var ARROWS = [
	// Iceland
	{
		'path': [
			[78, 32],
			[84, 30],
			[85.5, 26]
		]
	}
];

var FIT_SLOPE = -0.136362972;
var FIT_INTERCEPT = 35.20618078;

var graphicData = null;
var isMobile = false;

/**
 * Initialize the graphic.
 *
 * Fetch data, format data, cache HTML references, etc.
 */
function init() {
	d3.csv('data/graphic.csv', function(error, data) {
		graphicData = formatData(data);

		fm.setup()

		render();
		window.addEventListener("resize", utils.throttle(onResize, 250), true);
	});
}

/**
 * Format data or generate any derived variables.
 */
function formatData(data) {
	data.forEach(function(d) {
		d['gini'] = +d['gini'];
		d['pct_unionized'] = +d['pct_unionized'];
	});

	return data;
}

/**
 * Invoke on resize. By default simply rerenders the graphic.
 */
function onResize() {
	render();
}

/**
 * Figure out the current frame size and render the graphic.
 */
function render() {
	var width = d3.select("#interactive-content").node().getBoundingClientRect().width;

	if (width <= MOBILE_BREAKPOINT) {
		isMobile = true;
	} else {
		isMobile = false;
	}

	renderGraphic({
		container: '#graphic',
		width: width,
		data: graphicData
	});

	// Inform parent frame of new height
	fm.resize()
}

/*
 * Render the graphic.
 */
function renderGraphic(config) {
	// Configuration
	var aspectRatio = 16 / 9;

	var margins = {
		top: 10,
		right: 30,
		bottom: 50,
		left: 30
	};

	// Calculate actual chart dimensions
	var width = config['width'];
	var height = width / aspectRatio;

	var chartWidth = width - (margins['left'] + margins['right']);
	var chartHeight = height - (margins['top'] + margins['bottom']);

	// Clear existing graphic (for redraw)
	var containerElement = d3.select(config['container']);
	containerElement.html('');

	// Create the root SVG element
	var chartWrapper = containerElement.append('div')
		.attr('class', 'graphic-wrapper');

	var chartElement = chartWrapper.append('svg')
		.attr('width', chartWidth + margins['left'] + margins['right'])
		.attr('height', chartHeight + margins['top'] + margins['bottom'])
		.append('g')
		.attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

	// Create scales
	var xScale = d3.scaleLinear()
		.range([0, chartWidth])
		.domain([0, 100]);

	var yScale = d3.scaleLinear()
		.range([chartHeight, 0])
		.domain([0, 60]);

	// Create axes
	var xAxis = d3.axisBottom()
		.scale(xScale)
		.ticks(5)
		.tickFormat(function(d) {
			return d.toFixed(0) + '%';
		})

	var yAxis = d3.axisLeft()
		.scale(yScale)
		.ticks(5)
		.tickFormat(function(d) {
			return d.toFixed(0);
		})

	// Render axes
	var xAxisElement = chartElement.append('g')
		.attr('class', 'x axis')
		.attr('transform', "translate(" + [0, chartHeight] + ")")
		.call(xAxis);

	var yAxisElement = chartElement.append('g')
		.attr('class', 'y axis')
		.call(yAxis);

	// Render axes grids
	var xAxisGrid = function() {
		return xAxis;
	};

	xAxisElement.append('g')
		.attr('class', 'x grid')
		.call(xAxisGrid()
			.tickSize(-chartHeight, 0)
			.tickFormat('')
		);

	var yAxisGrid = function() {
		return yAxis;
	};

	yAxisElement.append('g')
		.attr('class', 'y grid')
		.call(yAxisGrid()
			.tickSize(-chartWidth, 0)
			.tickFormat('')
		);

		var fitLine = d3.line()
			.x(function(d) {
				return xScale(d['pct_unionized']);
			})
			.y(function(d) {
				return yScale(FIT_SLOPE * d['pct_unionized'] + FIT_INTERCEPT);
			})

	chartElement.append("path")
		.datum(config['data'])
		.attr("class", "fit-line")
		.attr("d", fitLine);

	chartElement.append('g')
		.attr('class', 'dots')
		.selectAll('circle')
		.data(config['data'])
		.enter()
		.append('circle')
			.attr('r', isMobile ? 3 : 5)
			.attr('cx', function(d) {
				return xScale(d['pct_unionized']);
			})
			.attr('cy', function(d) {
				return yScale(d['gini']);
			})
			.attr('class', 'dot')
			.attr('id', function(d) {
				return utils.classify(d['country']);
			})

	/*
	 * Render labels and arrows.
	 */
	chartElement.append('defs')
		 .append('marker')
		 .attr('id','arrowhead')
		 .attr('orient','auto')
		 .attr('viewBox','0 0 5.108 8.18')
		 .attr('markerHeight','8.18')
		 .attr('markerWidth','5.108')
		 .attr('orient','auto')
		 .attr('refY','4.09')
		 .attr('refX','5')
		 .append('polygon')
		 .attr('points','0.745,8.05 0.07,7.312 3.71,3.986 0.127,0.599 0.815,-0.129 5.179,3.999')
		 .attr('fill','#4C4C4C')

	var arrowLine = d3.line()
		.curve(d3.curveNatural)
		.x(function(d) {
			return xScale(d[0]);
		})
		.y(function(d) {
			return yScale(d[1]);
		});

	var arrows = chartElement.append('g')
		.attr('class', 'arrows');

	arrows.selectAll('path')
		.data(ARROWS)
		.enter().append('path')
		.attr('d', function(d) { return arrowLine(d['path']); })
		.style('marker-end', 'url(#arrowhead)');

	var labels = chartElement.append('g')
	  .attr('class', 'labels');

	labels.selectAll('text')
		.data(LABELS)
		.enter().append('text')
		.attr('x', function(d) {
			return xScale(d['pct_unionized']);
		})
		.attr('y', function(d) {
			return yScale(d['gini'])
		})
		.attr('text-anchor', function(d) {
			return d['text-anchor'] || LABEL_DEFAULTS['text-anchor'];
		})
		.style('alignment-baseline', function(d) {
			return 'middle';
		})
		.html(function(d) {
			return d['country'];
		});

	var annotation = chartElement.append('text')
		.attr('id', 'annotation')
		.attr('x', function(d) {
			return xScale(0) + 5;
		})
		.attr('y', function(d) {
			return yScale(60) + 2
		})
		.attr('text-anchor', 'start')
		.style('alignment-baseline', 'middle')
		.style('font-size', '16px')
		.html('gini coefficient of inequality');

	var bbox = annotation.node().getBBox();

	chartElement.append('rect')
		.attr('id', 'annotation-background')
		.attr('x', bbox.x)
		.attr('y', bbox.y)
		.attr('width', bbox.width + 5)
		.attr('height', bbox.height + 5)

	annotation.moveToFront();

	chartElement.append('text')
		.attr('id', 'x-label')
		.attr('x', chartWidth / 2)
		.attr('y', chartHeight + 45)
		.attr('text-anchor', 'middle')
		.html('Share of workers who are unionized')
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

// Bind on-load handler
document.addEventListener("DOMContentLoaded", function() {
	init();
});
