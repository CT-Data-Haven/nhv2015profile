$(document).ready(function() {
    var width = 500;
    var height = 540;
    var margin = { top: 12, right: 12, bottom: 20, left: 12 };
    var tip = d3.tip()
        .attr('class', 'd3-tip');// temp

    var color = d3.scaleQuantize()
        .range(d3.schemeRdPu[7]);

    var svg = d3.select('#map')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    var proj = d3.geoMercator()
        .center([-72.929916, 41.310726])
        .scale(200000)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath().projection(proj);
    var indic = $('#indicMenu').children('option:selected').text();
    $('#indicMenu').change(function() {
        indic = $(this).children('option:selected').text();
        console.log(indic);
    });





    d3.csv('nhv_data2.csv', function(data) {
        $('#indicMenu').change();
        data.forEach(function(d) {
            d.value = +d.value;
        });
        var nested = d3.nest()
            .key(function(d) { return d.indicator; })
            // .sortValues(function(a, b) { return a.order - b.order; })
            .map(data);
        // var indic = 'Child low-income rate';
        var indicValues = nested.get(indic);

        color.domain(d3.extent(indicValues, function(d) { return +d.value; }));
        //
        var hoodMap = {}; // to match names of neighborhoods with values from indicValues
        indicValues.forEach(function(d) {
            hoodMap[d.Neighborhood] = +d.value;
        });

        d3.json('nhv_shape2.json', function(error, topo) {
            if (error) throw error;

            var polygons = svg.append('g')
                .selectAll('path')
                .data(topojson.feature(topo, topo.objects.nhv_shape).features)
            .enter().append('path')
                .attr('d', path)
                .style('opacity', 0.8)
                .attr('class', 'polygon')
                .attr('fill', function(d, i) {
                    var value = hoodMap[d.properties.Neighborhood];
                    if (value) {
                        return color(value);
                    } else {
                        return '#bbbbbb';
                    }
                });

            polygons.call(tip)
                .on('mouseover', function(d) {
                    var hood = d.properties.Neighborhood;
                    var value = hoodMap[hood];
                    var valText = value ? d3.format('.0%')(value) : 'N/A';
                    tip.html('<span class="tip-label">' + hood + ': </span>' + valText);
                    tip.show();
                    console.log(d.properties.Neighborhood + ': ' + hoodMap[d.properties.Neighborhood]);
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style('opacity', 1.0)
                        .style('stroke', 'black')
                        .style('stroke-width', '2px')
                        .style('z-index', 1000);
                })
                .on('mouseout', function() {
                    tip.hide();
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style('opacity', 0.8)
                        .style('stroke', '#666')
                        .style('stroke-width', '1px');
            });
        });


    });

});
