$(document).ready(function() {

    var topic, nested, filtered;

    $('#topicSelect').on('change', changeTopic);


    var fullwidth = 600;
    var fullheight = 70;
    var margin = { top: 8, right: 20, bottom: 20, left: 280 };
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

    d3.csv('nhv_data2.csv', function(data) {

        data.forEach(function(d) {
            d.value = +d.value;
        });

        yscale.domain(data.map(function(d) { return d.indicator; }));

        nested = d3.nest()
            .key(function(d) { return d.indicator; })
            .sortKeys(d3.ascending)
            .entries(data);

        nested.forEach(function(d) {
            d.topic = d.values[0].topic;
        });

        changeTopic();

        // filtered = nested.filter(function(d) {
        //     return d.topic === topic;
        // });

        // var svg = d3.select('#chart')
        //     .selectAll('svg')
        //     .data(filtered)
        // .enter().append('svg')
        //     .attr('width', fullwidth)
        //     .attr('height', fullheight)
        // .append('g')
        //     .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


    });


    ////////////////////////
    function draw() {
        console.log(filtered);
        var svg = d3.select('#chart')
            .selectAll('svg')
            .data(filtered)
        .enter().append('svg')
            .attr('width', fullwidth)
            .attr('height', fullheight)
        .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    }

    function changeTopic() {
        topic = $('#topicSelect').val();
        console.log(topic);
        filtered = nested.filter(function(d) {
            return d.topic === topic;
        });
        draw();
    }

});
