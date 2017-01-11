//////////// global variables

var chartAttr = {
    fullwidth: 543,
    fullheight: 60,
    top: 0, right: 40, bottom: 20, left: 140,
    zoomFull: 280,
    r: 16
};
chartAttr.width = chartAttr.fullwidth - chartAttr.left - chartAttr.right;
chartAttr.height = chartAttr.fullheight - chartAttr.top - chartAttr.bottom;
chartAttr.zoomHeight = chartAttr.zoomFull - chartAttr.top - chartAttr.bottom;

var mapAttr = {
    fullwidth: 543,
    fullheight: 543,
    top: 12, right: 12, bottom: 20, left: 12
};
mapAttr.width = mapAttr.fullwidth - mapAttr.left - mapAttr.right;
mapAttr.height = mapAttr.fullheight - mapAttr.top - mapAttr.bottom;

// $(function() { $('#datatable').tablesorter({ headerTemplate: '{content} {icon}' }); });

/////////////////////////////////
var globaldata;

d3.queue()
    .defer(d3.json, 'json/wby_shape.json')
    .defer(d3.csv, 'data/wby_long2015.csv')
    .await(init);

///////////////////// INITIALIZE: CALL DRAWDOTS, DRAWMAP, TRIGGER TOPIC MENU CHANGE
function init(error, json, csv) {
    if (error) throw error;

    // prep & nest data
    csv.forEach(function(d) {
        d.value = +d.value;
    });

    // filter for topic === map; use this for nested & byTopic.
    // no filter, nest by topic; use for table
    var csvMap = csv.filter(function(d) { return d.type === 'map'; });

    var nested = d3.nest()
        .key(function(d) { return d.indicator; })
        // .sortValues(function(a, b) { return a.order - b.order; })
        .sortValues(function(a, b) { return b.value - a.value; })
        .entries(csvMap);
    nested.forEach(function(d) {
        d.topic = d.values[0].topic;
        // d.order = +d.values[0].order;
    });

    var byTopic = d3.nest()
        .key(function(d) { return d.topic; })
        // .sortValues(function(a, b) { return a.order - b.order; })
        .entries(csvMap);
    byTopic.forEach(function(d) {
        d.displayTopic = d.values[0].displayTopic;
    });

    // make menus
    d3.select('#topicMenu')
        .selectAll('option')
        .data(byTopic)
        .enter().append('option')
            .attr('value', function(d) { return d.key; })
            .text(function(d) { return d.displayTopic; });
    // try sending raw csv to make table instead?
    $('#topicMenu').on('change', {nested: nested, csv: csv}, changeTopic);
    // $('#topicMenu').on('change', {nested: nested, nestTable: nestTable}, changeTopic);
    $('#indicMenu').on('change', {csv: csvMap}, changeIndic);

    drawDots(nested);
    drawMap(json);

    $.tablesorter.themes.bootstrap = {
        icons        : '', // add "icon-white" to make them white; this icon class is added to the <i> in the header
        iconSortNone : 'bootstrap-icon-unsorted', // class name added to icon when column is not sorted
        iconSortAsc  : 'glyphicon glyphicon-chevron-up', // class name added to icon when column has ascending sort
        iconSortDesc : 'glyphicon glyphicon-chevron-down',
        table: 'table-hover'
    };
    $('#datatable').tablesorter({
        theme: 'bootstrap',
        headerTemplate: '{content} {icon}',
        // widgets: ['uitheme', 'stickyHeaders', 'scroller'],
        // widgets: ['uitheme', 'stickyHeaders'],
        widgets: ['uitheme', 'reflow', 'zebra'],
        widgetOptions: {
            reflow_className: 'ui-table-reflow',
            reflow_headerAttrib: 'data-name',
            reflow_dataAttrib: 'data-title'
            // stickyHeaders: 'sticky',
            // stickyHeaders_addResizeEvent: false
            // scroller_height: 550
        }
    });

    // DO THIS LAST
    $('#topicMenu').change();
}

function changeTopic(event) {
    var topic = this.value;
    var displayTopic = $('#topicMenu').children('option:selected').text();
    $('#chart-title').text(displayTopic);
    $('#indicMenu').empty();

    var nested = event.data.nested;
    var csv = event.data.csv;

    var filtered = nested.filter(function(d) {
        return d.topic === topic;
    });

    var indics = d3.select('#indicMenu')
        .selectAll('option')
        .data(filtered)
        .enter().append('option')
            .attr('value', function(d) { return d.key; })
            .attr('data-topic', function(d) { return d.topic; })
            // .sort(function(a, b) { return a.order - b.order; })
            .text(function(d) { return d.key; });

    d3.selectAll('.chart-div')
        .style('display', 'none')
        .filter(function(d) { return d.topic === topic; })
            .style('display', 'block');

    var topicTable = [];

    csv.forEach(function(row) {
        if (row.topic === topic) { topicTable.push(row); }
    });

    makeTable(topicTable);

    // change indicator after menu options are set
    $('.topic-header').text(displayTopic);
    $('#indicMenu').children('option').eq(0).attr('selected', true);
    $('#indicMenu').change();
}

function changeIndic(event) {
    var indic = this.value;
    $('.indic-header').text(indic);
    // use csv data passed in to fill map polygons via d3.selectAll('.polygon')
    var csv = event.data.csv;
    colorMap(csv, indic);
}

function drawDots(nested) {
    // set xscale for each multiple, not here
    var divs = d3.select('#chart')
        .selectAll('.chart-div')
        .data(nested)
        .enter().append('div')
            .attr('class', 'chart-div')
            // .sort(function(a, b) { return a.order - b.order; })
            .each(makeMultiple);
}

function makeMultiple(indicator) {
    var div = d3.select(this);
    var isZoomed = false;

    // scales
    var xscale = d3.scaleLinear()
        .domain(d3.extent(indicator.values, function(d) { return d.value; }))
        .range([0, chartAttr.width])
        .nice();
    var yscale = d3.scaleBand()
        .domain(indicator.values.map(function(d) { return d.Zip; }))
        .rangeRound([0, chartAttr.zoomHeight])
        .padding(0.2);

    var xaxis = d3.axisBottom()
        .scale(xscale)
        .ticks(4, '%');
    var yaxis = d3.axisLeft().scale(yscale);

    // drawing attributes
    var r = chartAttr.r;
    // break in two parts, one for each transition
    var dotAttr1 = {
        width: r,
        height: r,
        rx: r,
        ry: r
    };
    var dotAttr2 = {
        x: function(d) { return xscale(d.value) - r / 2; },
        y: chartAttr.height / 2
    };
    var barAttr = {
        x: 0,
        y: function(d) { return yscale(d.Zip); },
        height: yscale.bandwidth(),
        rx: 0,
        ry: 0
    };

    var labelContainer = div.append('div')
        .attr('class', 'label-container col-sm-12');

    // label with name of indicator
    var labelRow1 = labelContainer.append('div')
        .attr('class', 'row')
        .style('margin-bottom', '2px');
    var labelRow2 = labelContainer.append('div')
        .attr('class', 'row')
        .style('min-height', '1.2em');
    var label = labelRow1.append('div')
        .attr('class', 'indic-label col-sm-6')
        .text(function(d) { return d.key; });

    // buttons to expand/collapse
    var button = labelRow1.append('div')
        .attr('class', 'col-sm-6')
        .append('button')
        .attr('type', 'button')
        .attr('class', 'btn btn-default btn-xs zoom-button')
        .text('Expand');

    // tooltip, floated to right
    var tooltip = labelRow2.append('div')
        .attr('class', 'dot-tooltip col-sm-12')
        .text(' ');
    tooltip.append('span').attr('class', 'tool-label');
    tooltip.append('span').attr('class', 'tool-value');

    var localsvg = div.append('svg')
        // .attr('width', chartAttr.fullwidth)
        // .attr('height', chartAttr.fullheight)
        .attr('width', '100%')
        .attr('viewBox', '0 0 ' + chartAttr.fullwidth + ' ' + chartAttr.fullheight)
        .attr('class', 'chart-svg');

    var g = localsvg.append('g')
        .attr('transform', 'translate(' + chartAttr.left + ',' + chartAttr.top + ')');

    var axis = g.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + chartAttr.height + ')')
        .call(xaxis);
    var hoodLabels = g.append('g')
        .attr('class', 'y axis')
        .attr('display', 'none')
        .call(yaxis);


    var dots = g.selectAll('.dot')
        .data(function(d) { return d.values; })
        .enter().append('rect')
            .attr('class', 'dot')
            .attrs(dotAttr1)
            .attrs(dotAttr2)
            .on('mouseover', mouseOverDot)
            .on('mouseout', mouseOutDot);

    button.on('click', function() {
        var newheight = isZoomed ? chartAttr.fullheight : chartAttr.zoomFull;

        // d3.selectAll('.chart-svg')
        //     .transition()
        //     .duration(500)
        //         .attr('height', chartAttr.fullheight);
        localsvg.transition()
            .duration(1000)
                .attr('viewBox', '0 0 ' + chartAttr.fullwidth + ' ' + newheight);
                // .attr('height', newheight);

        if (isZoomed) {
            // shrink bars back to dots
            xscale.domain(d3.extent(indicator.values, function(d) { return d.value; }));
            axis.transition()
                .duration(1000)
                    .attr('transform', 'translate(0,' + chartAttr.height + ')')
                    .call(xaxis);
            hoodLabels.transition()
                .duration(1000)
                    .attr('display', 'none');

            dots.transition()
                .duration(500)
                    .attr('stroke-width', 0)
                    .attrs(dotAttr1)
                .transition()
                .duration(500)
                    .attrs(dotAttr2);
            // set button text to say expand
            button.text('Expand');
        } else {
            // grow dots out to bars
            xscale.domain([0, d3.max(indicator.values, function(d) { return d.value; })]);
            axis.transition()
                .duration(1000)
                .attr('transform', 'translate(0,' + chartAttr.zoomHeight + ')')
                .call(xaxis);
            hoodLabels.transition()
                .duration(1000)
                    .attr('display', 'inline')
                    .call(yaxis);

            dots.transition()
                .duration(500)
                    .attrs(barAttr)
                .transition()
                .duration(1000)
                    .attr('width', function(d) { return xscale(d.value); });
            button.text('Collapse');
        }

        // do this last--toggle zoomed state
        isZoomed = !isZoomed;
    });

}

function mouseOverDot(dot) {
    var hood = d3.selectAll('.dot')
        .filter(function(d) { return d.Zip === dot.Zip; });
    hood.classed('hilite', true)
        .transition()
        .duration(200)
            .style('stroke-width', '8px');

    // tooltips are html elements with class dot-tooltip
    var tips = d3.selectAll('.dot-tooltip');
    d3.selectAll('.tool-label')
        .text(dot.Zip + ': ');
    d3.selectAll('.tool-value')
        .text(function(d) {
            var vals = d.values
                .filter(function(a) { return a.Zip === dot.Zip; });
            return d3.format('.0%')(vals[0].value);
        });

    // highlight map polygon filtered for same neighborhood
    d3.selectAll('.polygon')
        .filter(function(d) { return d.properties.Zip === dot.Zip; })
            .classed('map-hover', true);
}

function mouseOutDot(dot) {
    var hood = d3.selectAll('.dot')
        .filter(function(d) { return d.Zip === dot.Zip; });

    // d3.selectAll('.dot')
    hood.classed('hilite', false)
        .transition()
        .duration(200)
            .style('stroke-width', '0');
    // clear tooltip text
    d3.selectAll('.dot-tooltip')
        .selectAll('span')
        .text('');

    // unhighlight all map polygons
    d3.selectAll('.polygon')
        .classed('map-hover', false);
}

function drawMap(topo) {
    var svg = d3.select('#map')
        .append('svg')
        .attr('id', 'mapSVG')
        .attr('width', '100%')
        .attr('viewBox', '0 0 ' + mapAttr.fullwidth + ' ' + mapAttr.fullheight);
        // .attr('width', mapAttr.fullwidth)
        // .attr('height', mapAttr.fullheight);

    var proj = d3.geoMercator()
        .center([-73.037419, 41.5615])
        .scale(165000)
        .translate([mapAttr.width / 2, mapAttr.height * 1 / 2.5]);

    var path = d3.geoPath().projection(proj);

    var polygons = svg.append('g')
        .attr('transform', 'translate(' + mapAttr.left + ',' + mapAttr.top + ')')
        .selectAll('path')
        .data(topojson.feature(topo, topo.objects.wby_shape).features)
        .enter().append('path')
            .attr('d', path)
            .attr('class', 'polygon');
}

function colorMap(csv, indicator) {
    // clear previous legend
    d3.select('.legendQuant').remove();

    // need to also have diverging scale for childcare indicators--check whether max value > 1

    var nested = d3.nest()
        .key(function(d) { return d.indicator; })
        .map(csv);

    var indicValues = nested.get(indicator);

    // temp
    globaldata = indicValues;

    var tip = d3.tip()
        .attr('class', 'd3-tip');

    var vals = indicValues.map(function(d) { return +d.value; });
    var breaks = ss.ckmeans(vals, 5).map(function(val) { return val[0]; }).slice(1);

    var color = d3.scaleThreshold()
        .domain(breaks)
        .range(d3.schemePurples[5]);


    // object to match names of neighborhoods with values from indicValues
    var hoodMap = {};
    indicValues.forEach(function(d) {
        hoodMap[d.Zip] = +d.value;
    });

    var polygons = d3.selectAll('.polygon')
        .attr('fill', function(d) {
            var value = hoodMap[d.properties.Zip];
            if (typeof value === 'undefined') {
                return '#bbb';
            } else {
                return color(value);
            }
        });
    polygons.call(tip)
        .on('mouseover', function() {
            tip.html(mouseOverPoly(d3.select(this), hoodMap));
            tip.show();
        })
        .on('mouseout', function() {
            tip.hide();
            mouseOutPoly(d3.select(this));
        });

    // draw legend
    var svg = d3.select('#mapSVG');
    svg.append('g')
        .attr('class', 'legendQuant')
        .attr('transform', 'translate(30,' + 400 + ')');

    // have to redo threshold label helper from d3-legend
    var legend = d3.legendColor()
        .labelFormat(d3.format('.0%'))
        .labels(thresholdLabels)
        .useClass(false)
        .scale(color);
    svg.select('.legendQuant').call(legend);

}

function thresholdLabels(l) {
    if (l.i === 0) {
        return l.generatedLabels[l.i].replace('NaN% to', 'Less than');
    } else if (l.i === l.genLength - 1) {
        var str = 'More than ' + l.generatedLabels[l.genLength - 1];
        return str.replace(' to NaN%', '');
    }
    return l.generatedLabels[l.i];
}

function mouseOverPoly(poly, hoodMap) {
    var hood = poly.datum().properties.Zip;
    var value = hoodMap[hood];
    var valText = typeof value === 'undefined' ? 'N/A' : d3.format('.0%')(value);
    // tip.html('<span class="tip-label">' + hood + ': </span>' + valText);
    // d3.select(this).classed('map-hover', true);
    poly.classed('map-hover', true);

    // highlight dots with same neighborhood
    d3.selectAll('.dot')
        .filter(function(d) { return d.Zip === hood; })
            .classed('hilite', true)
            .transition()
            .duration(200)
                .style('stroke-width', '8px');
    // return to tip.html
    return '<span class="tip-label">' + hood + ': </span>' + valText;
}

function mouseOutPoly(poly) {
    poly.classed('map-hover', false);
    d3.selectAll('.dot').classed('hilite', false)
        .transition()
        .duration(200)
            .style('stroke-width', 0);
}

function makeTable(table) {
    var table_el = d3.select('#datatable');
    // clear old table
    table_el.select('thead').selectAll('tr').remove();
    table_el.select('tbody').selectAll('tr').remove();
    // var ths = [];
    // data.forEach(function(indic) {
    //     ths.push(indic.key);
    // });
    // // $('#datatable thead tr').html(ths);
    // table.select('thead')
    //     .append('tr')
    //     .selectAll('th')
    //     .data(ths)
    //     .enter().append('th')
    //         .text(function(d) { return d; });
    //
    // nest by neighborhoods--makes each array item a row
    // convert to wide data
    var wide = d3.nest()
        .key(function(d) { return d.Zip; })
        .rollup(function(d) {
            return d.reduce(function(prev, curr) {
                prev.Zip = curr.Zip;
                prev[curr.indicator] = curr.value;
                return prev;
            }, {});
        })
        .entries(table);
    // make th elements--get array of unique values for indicator from table
    var indicators = d3.set(table.map(function(d) {
        return d.indicator;
    })).values();
    // add Neighborhood to end of indicators
    indicators.unshift('Zip');

    var thead = table_el.select('thead')
        .append('tr')
        .selectAll('th')
        .data(indicators)
        .enter().append('th')
            .text(function(d) { return d; });
    // make rows
    var rows = table_el.select('tbody')
        .selectAll('tr')
        .data(wide)
        .enter().append('tr');
    // append td of neighborhood

    // append tds of indicators
    rows.selectAll('td')
        .data(function(row) {
            return indicators.map(function(indicator) {
                return { indicator: indicator, value: row.value[indicator] };
            });
        })
        .enter().append('td')
            .text(function(d, i) {
                // need to parse text: if indexOf('.') === -1, make comma separated; otherwise make percentage
                // just return value for i = 0 (neighborhood)
                if (i === 0) { return d.value; }
                var value = d.value.toString();
                var valText;
                if (value.indexOf('.') === -1) {
                    valText = numeral(value).format('0,0');
                } else {
                    valText = numeral(value).format('0%');
                }
                return valText;
                // return d.value;
            })
            .attr('class', function(d, i) {
                // make all but first td right aligned
                if (i) { return 'text-right'; }
            })
        .exit();

    // $('#datatable').trigger('updateAll', false, null);
    // $('#datatable').trigger('update');
    $('#datatable').trigger('updateAll');
}
