//////////// global values

d3.queue()
    .defer(d3.json, 'json/nhv_shape2.json')
    .defer(d3.csv, 'data/nhv_data2.csv')
    .await(init);


function init(error, json, csv) {
    if (error) throw error;

    // prep & nest data
    csv.forEach(function(d) {
        d.value = +d.value;
    });
    var nested = d3.nest()
        .key(function(d) { return d.indicator; })
        // .sortValues(function(a, b) { return a.order - b.order; })
        .entries(csv);
    nested.forEach(function(d) {
        d.topic = d.values[0].topic;
        d.order = +d.values[0].order;
    });
    // would dotplot work okay if this changed to a map? wouldn't have to replicate nesting to draw the choropleth

    var byTopic = d3.nest()
        .key(function(d) { return d.topic; })
        .sortValues(function(a, b) { return a.order - b.order; })
        .entries(csv);
    byTopic.forEach(function(d) {
        d.displayTopic = d.values[0].displayTopic;
    });

    d3.select('#topicMenu')
        .selectAll('option')
        .data(byTopic)
    .enter().append('option')
        .attr('value', function(d) { return d.key; })
        .text(function(d) {
            return d.displayTopic; });

    $('#topicMenu').on('change', {nested: nested}, changeTopic);
    $('#indicMenu').on('change', {csv: csv}, changeIndic);

    drawDots(nested);
    drawMap(json);

    // DO THIS LAST
    $('#topicMenu').change();
    // match heights after both charts are drawn
    $('.match').matchHeight();
}

function changeTopic(event) {
    var topic = this.value;
    var displayTopic = $('#topicMenu').children('option:selected').text();
    $('#chart-title').text(displayTopic);
    $('#indicMenu').empty();

    var nested = event.data.nested;

    var filtered = nested.filter(function(d) {
        return d.topic === topic;
    });

    var indics = d3.select('#indicMenu')
        .selectAll('option')
        .data(filtered)
    .enter().append('option')
        .attr('value', function(d) { return d.key; })
        .attr('data-topic', function(d) { return d.topic; })
        .sort(function(a, b) { return a.order - b.order; })
        .text(function(d) { return d.key; });

    d3.selectAll('svg.chart')
        .attr('display', 'none')
        .filter(function(d) { return d.topic === topic; })
            .attr('display', 'block');
    // change indicator after menu options are set
    $('#indicMenu').children('option').eq(0).attr('selected', true);
    $('#indicMenu').change();
}

function changeIndic(event) {

    var indic = this.value;
    $('#map-title').text(indic);
    // use csv data passed in to fill map polygons via d3.selectAll('.polygon')
    var csv = event.data.csv;
    colorMap(csv, indic);

}

function drawDots(nested) {

    var fullwidth = 640;
    var fullheight = 90;
    var margin = { top: 30, right: 40, bottom: 20, left: 280 };
    var width = fullwidth - margin.left - margin.right;
    var height = fullheight - margin.top - margin.bottom;
    var padding = 0;

    var xscale = d3.scaleLinear()
        .range([0, width]);
    var yscale = d3.scaleBand()
        .domain(nested[0].values.map(function(d) { return d.indicator; }))
        .rangeRound([height, 0])
        .padding(0.1);
    var xaxis = d3.axisBottom();

    var svg = d3.select('#chart')
        .selectAll('svg')
        .data(nested)
    .enter().append('svg')
        // .attr('width', fullwidth)
        // .attr('height', fullheight)
        .attr('width', '100%')
        // .attr('viewBox', '0 0 ' + width + ' ' + height)
        .attr('viewBox', '0 0 ' + fullwidth + ' ' + fullheight)
        .sort(function(a, b) { return a.order - b.order; })
        // .attr('data-topic', function(d) { return d.topic; })
        .attr('class', 'chart')
    .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .each(makeMultiple);


    var dots = d3.selectAll('.dot');
    d3.selectAll('.dot')
        .on('mouseover', mouseOverDot)
        .on('mouseout', mouseOutDot);

//////////////////////////

    function makeMultiple(indicator) {

        var localsvg = d3.select(this);
        xscale.domain(d3.extent(indicator.values, function(d) { return d.value; }))
            .nice();

        xaxis.scale(xscale)
            .ticks(4, '%');

        // indicator labels
        localsvg.append('g')
            .append('text')
            .attr('x', 0)
            .attr('dy', '0.7em')
            .attr('transform', 'translate(-16,' + (height / 2) + ')')
            .attr('text-anchor', 'end')
            .attr('class', 'label')
            .text(function(d) { return d.key; });

        localsvg.selectAll('.dot')
            .data(function(d) { return d.values; })
        .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', function(d) { return xscale(d.value); })
            .attr('cy', height / 2)
            .attr('r', 8);

        // x-axis
        localsvg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (height - padding) + ')')
            .call(xaxis);

        // tooltip
        localsvg.append('g')
            .attr('class', 'dot-tooltip')
            .attr('x', 0)
            .attr('transform', 'translate(' + width  + ',' + 0 + ')');
    }

}

function mouseOverDot(dot) {

    var hood = d3.selectAll('.dot')
        .filter(function(d) { return d.Neighborhood === dot.Neighborhood; });
    hood.classed('hilite', true)
        .transition()
        .duration(200)
        .attr('r', 16);

    var tips = d3.selectAll('.dot-tooltip')
        .append('text')
        .attr('dy', '0.4em')
        .attr('text-anchor', 'end');

    // neighborhood name in bold
    tips.append('tspan')
        .text(function() { return dot.Neighborhood + ': '; })
        .attr('class', 'tip-label');
    // value text
    tips.append('tspan')
        .text(function(d) {
            var vals = d.values
                .filter(function(a) { return a.Neighborhood === dot.Neighborhood; });
            return d3.format('.0%')(vals[0].value);
        });

    // highlight map polygon filtered for same neighborhood
    d3.selectAll('.polygon')
        .filter(function(d) { return d.properties.Neighborhood === dot.Neighborhood; })
        .classed('map-hover', true);

}

function mouseOutDot(dot) {

    d3.selectAll('.dot')
        .classed('hilite', false)
        .transition()
        .duration(200)
        .attr('r', 8);
    d3.selectAll('.dot-tooltip text').remove();
    // unhighlight all map polygons
    d3.selectAll('.polygon')
        .classed('map-hover', false);

}

function drawMap(topo) {
    // no indicator values, just map polygons from json
    var fullwidth = 524;
    var fullheight = 524;
    var margin = { top: 12, right: 12, bottom: 20, left: 12 };
    var width = fullwidth - margin.left - margin.right;
    var height = fullheight - margin.top - margin.bottom;

    var svg = d3.select('#map')
        .append('svg')
        .attr('id', 'mapSVG')
        .attr('width', '100%')
        // .attr('height', height + margin.top + margin.bottom);
        // .attr('viewBox', '0 0 ' + width + ' ' + height);
        .attr('viewBox', '0 0 ' + fullwidth + ' ' + fullheight);

    var proj = d3.geoMercator()
        .center([-72.929916, 41.310726])
        .scale(185000)
        .translate([width / 2, height * 1/2.5]);

    var path = d3.geoPath().projection(proj);

    var polygons = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .selectAll('path')
        .data(topojson.feature(topo, topo.objects.nhv_shape).features)
    .enter().append('path')
        .attr('d', path)
        .attr('class', 'polygon');

}

function colorMap(csv, indic) {
    // remove previous legend
    d3.select('.legendQuant').remove();

    var nested = d3.nest()
        .key(function(d) { return d.indicator; })
        .map(csv);

    var indicValues = nested.get(indic);
    var tip = d3.tip()
        .attr('class', 'd3-tip');// temp

    var color = d3.scaleQuantize()
        .domain(d3.extent(indicValues, function(d) { return +d.value; }))
        .range(d3.schemePurples[5]);
        // .range(d3.schemeGnBu[5]);
        // .range(['#fff0f5','#d9b9dd','#b283c4','#8a4eab','#5f1092']);
        // .range(['#c4f2f2','#aab8d6','#8e7eba','#6f479e','#4b0082']);

    // object to match names with values from indicValues
    var hoodMap = {};
    indicValues.forEach(function(d) {
        hoodMap[d.Neighborhood] = +d.value;
    });

    var polygons = d3.selectAll('.polygon')
        .attr('fill', function(d) {
            var value = hoodMap[d.properties.Neighborhood];
            if (typeof value !== 'undefined') {
                return color(value);
            } else {
                return '#bbb';
            }
        });
    polygons.call(tip)
        .on('mouseover', mouseOverPoly)
        .on('mouseout', mouseOutPoly);
    // draw legend
    var svg = d3.select('#mapSVG');
    svg.append('g')
        .attr('class', 'legendQuant')
        .attr('transform', 'translate(30,' + 400 + ')');
    var legend = d3.legendColor()
        .labelFormat(d3.format('.0%'))
        .useClass(false)
        .scale(color);
    svg.select('.legendQuant').call(legend);

    function mouseOverPoly(poly) {

        var hood = poly.properties.Neighborhood;
        var value = hoodMap[hood];
        var valText = typeof value === 'undefined' ? 'N/A' : d3.format('.0%')(value);
        tip.html('<span class="tip-label">' + hood + ': </span>' + valText);
        tip.show();
        d3.select(this).classed('map-hover', true);

        // highlight dots with same neighborhood
        d3.selectAll('.dot')
            .filter(function(d) { return d.Neighborhood === hood; })
            .classed('hilite', true);

    }

    function mouseOutPoly(poly) {

        tip.hide();
        d3.select(this).classed('map-hover', false);

        d3.selectAll('.dot').classed('hilite', false);

    }

}
