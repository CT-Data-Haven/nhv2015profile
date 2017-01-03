$(document).ready(function() {

    var topic, nested;

    $('#topicSelect').on('change', changeTopic);

    var fullwidth = 600;
    var fullheight = 70;
    var margin = { top: 8, right: 20, bottom: 10, left: 280 };
    var width = fullwidth - margin.left - margin.right;
    var height = fullheight - margin.top - margin.bottom;

    var xscale = d3.scaleLinear()
        .domain([0, 1.0])
        .range([0, width]);
    var yscale = d3.scaleBand()
        .rangeRound([height, 0])
        .padding(0.1);
    var xaxis = d3.axisBottom()
        .scale(xscale)
        .ticks(5, '%');

    // make svg from data, give topic ids, set visibility based on id

    d3.csv('nhv_data2.csv', function(data) {

        data.forEach(function(d) {
            d.value = +d.value;
        });

        yscale.domain(data.map(function(d) { return d.indicator; }));

        nested = d3.nest()
            .key(function(d) { return d.indicator; })
            // .sortKeys(d3.ascending)
            .entries(data);

        nested.forEach(function(d) {
            d.topic = d.values[0].topic;
        });

        var svg = d3.select('#chart')
            .selectAll('svg')
            .data(nested)
        .enter().append('svg')
            .attr('width', fullwidth)
            .attr('height', fullheight)
            // .attr('data-topic', function(d) { return d.topic; })
            .attr('class', 'chart')
        .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
            .call(xaxis);

        svg.append('g')
            .append('text')
            .attr('x', 0)
            .attr('dy', '0.7em')
            .attr('transform', 'translate(-16,' + (height / 2) + ')')
            .attr('text-anchor', 'end')
            .attr('class', 'label')
            .text(function(d) { return d.key; });



        changeTopic();

    });


    ////////////////////////
    function draw() {

    }

    function changeTopic() {
        topic = $('#topicSelect').val();
        d3.selectAll('svg.chart')
            .attr('display', 'none')
            .filter(function(d) { return d.topic === topic; })
                .attr('display', 'block');

        // draw();
    }

});
