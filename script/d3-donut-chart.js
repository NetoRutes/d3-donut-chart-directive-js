const DEFAULT_SIZE = 300;
var thickness = 40;
var duration = 750;

var toolTipDiv = d3.select(".donut-chart").append("div").attr("class", "toolTip");
var circleTipDiv = d3.select(".donut-chart").append("div").attr("class", "circleTip");
d3.selectAll(".donut-chart")
    .append('svg')
    .attr('class', 'pie')
    .each(function (d, i) {
        var svg = d3.select(this);
        var parentNode = svg._groups[0][0].parentElement;
        var width = height = parentNode.getAttribute('size') ? parentNode.getAttribute('size') : DEFAULT_SIZE;
        var radius = Math.min(width, height) / 2;

        svg.style('width', width);
        svg.style('height', height);
        svg.style('padding', '10px 45px');
        svg.style('overflow', 'visible');

        var g = svg.append('g')
            .attr('transform', 'translate(' + (width / 2) + ',' + (height / 2) + ')');

        g.append('g').attr('class', 'slices');
        g.append('g').attr('class', 'labelName');
        g.append('g').attr('class', 'lines');

        var arc = d3.arc()
            .outerRadius(radius * 0.8)
            .innerRadius(radius * 0.6)
            .cornerRadius(3)
            .padAngle(0.015);
        // this arc is used for aligning the text labels
        var outerArc = d3.arc()
            .outerRadius(radius * 0.9)
            .innerRadius(radius * 0.9);

        var label = parentNode.getAttribute('label') ? parentNode.getAttribute('label') : 'name';
        var slice = parentNode.getAttribute('slice') ? parentNode.getAttribute('slice') : 'value';
        var tooltipStyle = parentNode.getAttribute('tooltip') ? parentNode.getAttribute('tooltip') : 'circle';
        var tooltipMsg = parentNode.getAttribute('tooltip-msg') ? parentNode.getAttribute('tooltip-msg') : '';

        var pie = d3.pie()
            .value(function (d) { return d[slice]; })
            .sort(null);

        var color = parentNode.getAttribute('colorScheme') ?
            d3.scaleOrdinal(d3[parentNode.getAttribute('colorScheme')]) :
            d3.scaleOrdinal(d3.schemeCategory10);

        d3.json(parentNode.getAttribute('url'), function (res) {
            var data = res;

            // add and colour the donut slices
            var path = g.select('.slices')
                .datum(data)
                .selectAll('path')
                .data(pie)
                .enter()
                .append('path')
                .style("opacity", 0.9)
                .attr('d', arc)
                .attr('fill', (d, i) => color(i))
                .attr("data", function (d) {
                    d.data["percentage"] = (d.endAngle - d.startAngle) / (2 * Math.PI) * 100;
                    return JSON.stringify(d.data);
                })
                .on("mousemove", function (d) {
                    var currentEl = d3.select(this);
                    var tooltipData = JSON.parse(currentEl.attr("data"));
                    if (tooltipStyle === 'popover') {
                        toolTipDiv.transition()
                            .duration(150)
                            .style("opacity", 1);
                        toolTipDiv.style("left", d3.event.pageX + 10 + "px");
                        toolTipDiv.style("top", d3.event.pageY - 25 + "px");
                        toolTipDiv.html(extractVariables(tooltipMsg, d));
                    } else {
                        toolTipDiv.transition()
                            .duration(150)
                            .style("opacity", 1);
                        toolTipDiv.style("left", d3.event.pageX + 10 + "px");
                        toolTipDiv.style("top", d3.event.pageY - 25 + "px");
                        toolTipDiv.html(d3.format("0.2f")(tooltipData["percentage"]) + "%");
                    }
                })
                .on("mouseover", function (d) {
                    d3.select(this)
                        .style("cursor", "pointer")
                        .style("opacity", 1);
                })
                .on('mouseenter', function (d) {
                    if (tooltipStyle === 'circle' && tooltipMsg !== '') {
                        svg.append('text')
                            .attr('transform', 'translate(' + (width / 2) + ',' + (width / 2) + ')')
                            .attr('class', 'toolCircleMsg')
                            .attr('dy', -15) // hard-coded. can adjust this to adjust text vertical alignment in tooltip
                            .html(extractVariables(tooltipMsg, d)) // add text to the circle.
                            .style('font-size', '1em')
                            .style('text-anchor', 'middle') // centres text in tooltip

                        svg.append('circle')
                            .attr('transform', 'translate(' + (width / 2) + ',' + (width / 2) + ')')
                            .attr('class', 'toolCircle')
                            .attr('r', radius * 0.55) // radius of tooltip circle
                            .attr('fill', color(this._current)) // colour based on category mouse is over
                            .style('fill-opacity', 0.35)
                    }

                })
                .on("mouseout", function (d) {
                    d3.select(this)
                        .style("cursor", "none")
                        .style("fill", color(this._current))
                        .style("opacity", 0.9);
                    toolTipDiv.transition()
                        .duration(300)
                        .style("opacity", 0);
                    d3.selectAll('.toolCircle').remove();
                    d3.selectAll('.toolCircleMsg').remove();

                })
                .each(function (d, i) { this._current = i; });

            // add text labels
            g.select('.labelName')
                .datum(data)
                .selectAll('text')
                .data(pie)
                .enter()
                .append('text')
                .attr('dy', '.35em')
                .html(function (d) {
                    // add "key: value" for given category. Number inside tspan is bolded in stylesheet.
                    return d.data[label];
                })
                .attr('transform', function (d) {

                    // effectively computes the centre of the slice.
                    var pos = outerArc.centroid(d);

                    // changes the point to be on left or right depending on where label is.
                    pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
                    return 'translate(' + pos + ')';
                })
                .style('text-anchor', function (d) {
                    // if slice centre is on the left, anchor text to start, otherwise anchor to end
                    return (midAngle(d)) < Math.PI ? 'start' : 'end';
                });

            // add lines connecting labels to slice. A polyline creates straight lines connecting several points
            g.select('.lines')
                .datum(data)
                .selectAll('polyline')
                .data(pie)
                .enter()
                .append('polyline')
                .attr('points', function (d) {
                    // see label transform function for explanations of these three lines.
                    var pos = outerArc.centroid(d);
                    pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
                    return [arc.centroid(d), outerArc.centroid(d), pos]
                });

        });

        function midAngle(d) {
            return d.startAngle + (d.endAngle - d.startAngle) / 2;
        }

        function extractVariables(str, data) {
            var param = str.match(/{{(.*)}}/);
            if (param) {
                param = param.pop();
                return str.replace(/{{(\w+)}}/g, data.data[param]);
            }
            return str;
        }

    });
