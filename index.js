(async function () {

    /**
     * Stack bar order for the values
     */
    const nodes = ['URIEL-YOGAC940-', 'NODE 2', 'NODE 3'];
    const colors = ['green', 'magenta', 'brown'];
    const queueData = {
        text: 'Queue length',
        color: 'grey',
        type: 'line'
    }

    const IN_LAST_DAY = 'in-last-day';
    const IN_LAST_WEEK = 'in-last-week';
    const IN_LAST_MONTH = 'in-last-month';
    const IN_LAST_YEAR = 'in-last-year';
    const BEFORE = 'before';
    const AFTER = 'after';
    const BETWEEN = 'between';

    const xFormat = {
        [IN_LAST_DAY]: { format: "%I:%M %p", ticks: 8 },
        [IN_LAST_WEEK]: { format: "%A", ticks: 7 },
        [IN_LAST_MONTH]: { format: "%m/%d/%y", ticks: 30 },
        [IN_LAST_YEAR]: { format: "%b %y", ticks: 12 },
        [BEFORE]: { format: "%m/%d/%y", ticks: 30 },
        [AFTER]: { format: "%m/%d/%y", ticks: 30 },
        [BETWEEN]: { format: "%m/%d/%y", ticks: 30 }
    }


    const chart = setupChart();
    const data = await new Promise((resolve) => {
        d3.json('data.json', function (data) {
            data.forEach(d => {
                const { queuedTime, startTime, endTime } = d.progress;
                d.progress = {
                    queuedTime: new Date(queuedTime),
                    startTime: new Date(startTime),
                    endTime: new Date(endTime)
                }

            });
            resolve(data)
        })

    });
    const controls = setupControls(data, chart);


    /**
     * THE CHART ITSELF
     */
    function setupChart() {
        const title = d3.select('#title');
        const legendContainer = d3.select('#legend-container');
        setupLegend();

        const margin = { top: 20, right: 20, bottom: 70, left: 80 };
        width = document.getElementById('stack-bar').getBoundingClientRect().width - margin.left - margin.right;
        height = document.getElementById('stack-bar').getBoundingClientRect().height - margin.top - margin.bottom;
        let svg = d3.select('#stack-bar')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);
        svg = svg.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        function updateTitle(text) {
            title.html(text);
        }

        function setupLegend() {
            const legendData = nodes.map((l, index) => {
                return {
                    text: l,
                    color: colors[index],
                    type: 'rect'
                }
            });
            //add Queue length data;
            legendData.push(queueData)
            const legend = legendContainer.selectAll('.legend')
                .data(legendData)
                .enter()
                .append('div')
                .style('display', 'inline-block')
                .style('cursor', 'pointer')
                .style('margin-right', (_, index) => index === legendData.length - 1 ? '0px' : '16px')
                .on('mouseover', function (_, i) {
                    d3.selectAll('.stack, .line-queue').transition().style('opacity', .08);
                    d3.selectAll('.stack-' + i).transition().style('opacity', 1);
                })
                .on('mouseleave', function (_, i) {
                    d3.selectAll('.stack, .line-queue').transition().style('opacity', 1);
                });;

            //add the legend color indicator
            legend.append('div')
                .style('display', 'inline-block')
                .style('width', '40px')
                .style('height', d => d.type === 'line' ? '6px' : '12px')
                .style('margin-top', '4px')
                .style('background', d => d.color);

            // add the text
            legend.append('div')
                .style('display', 'inline-block')
                .style('font-size', '12px')
                .style('margin-left', '8px')
                .html(d => d.text)
        }

        function update(data, dateRangeValue) {
            svg.selectAll("*").remove();
            if (data.length < 1) {
                svg.append('text')
                    .attr('x', width / 2)
                    .attr('y', height / 2)
                    .style('font-weight', 'bold')
                    .style('font-size', 14)
                    .style('text-anchor', 'middle')
                    .text('No Data Available')
                return
            }
            legendContainer.style('opacity', 1);
            const dateRange = d3.extent(data, function (d) { return d.time; });
            const xScale = d3.scaleTime()
                .domain(dateRange)
                .range([0, width]);
            const ticksDetails = xFormat[dateRangeValue];
            const tickValues = [];
            const xAxis = svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xScale).ticks(ticksDetails.ticks).tickFormat(function (d) {
                    const value = d3.timeFormat(ticksDetails.format)(d);
                    if (tickValues.includes(value)) {
                        return ""
                    }
                    tickValues.push(value);
                    return value;
                }));

            //remove the bold line at the bottom of the chart
            xAxis.select('.domain').remove();
            //remove the vertical tick lines
            xAxis.selectAll('.tick line').remove();
            //rotate the labels to rotate vertically
            xAxis.selectAll("text")
                .attr("y", 0)
                .attr("x", -9)
                .attr("dy", ".35em")
                .attr("transform", "rotate(-90)")
                .style("text-anchor", "end");
            let maxSumForY = d3.max(data, (d) => {
                let sum = 0;
                nodes.forEach(n => {
                    sum += d[n];
                })
                return Math.max(sum, d.queue_length);
            });
            maxSumForY = Math.round(maxSumForY + .1 * maxSumForY);
            const yScale = d3.scaleLinear()
                .domain([0, maxSumForY])
                .range([height, 0]);

            const yAxis = svg.append("g")
                .call(d3.axisLeft(yScale));
            //remove the bold line at the left side of the chart
            yAxis.select('.domain').remove();
            //remove the horizontal tick lines
            yAxis.selectAll('.tick line').remove();

            // add the Y horizontal lines
            const gridAxis = svg.append("g")
                .attr("class", "grid")
                .call(d3.axisLeft(yScale)
                    .tickSize(-width)
                    .tickFormat("")
                );
            gridAxis.selectAll('.tick line').style('stroke', 'gray').style('stroke-width', .5)
            gridAxis.select('.domain').remove()

            // Add the text label for Y axis
            svg.append("text")
                .attr('id', 'y_axis_label')
                .attr("x", -height / 2)
                .attr("y", -50)
                .attr("transform", "rotate(-90)")
                .style("text-anchor", "middle")
                .text("Number of Jobs");

            var color = d3.scaleOrdinal()
                .domain(nodes)
                .range(colors)

            const stackedData = d3.stack()
                .keys(nodes)
                (data);

            svg.selectAll(".stack")
                .data(stackedData)
                .enter()
                .append("path")
                .attr('class', (_, i) => { return 'stack ' + `stack-${i}` })
                .style("fill", function (d) { return color(d.key); })
                .attr("d", d3.area()
                    .x(function (d, i) { return xScale(d.data.time); })
                    .y0(function (d) { return yScale(d[0]); })
                    .y1(function (d) { return yScale(d[1]); })
                );

            svg.selectAll(".line-queue")
                .data([data])
                .enter()
                .append("path")
                .attr('class', (_) => { return 'line-queue ' + `stack-${stackedData.length}` })
                .style("stroke", function (d) { return queueData.color; })
                .style('stroke-width', 3)
                .style('fill', 'none')
                .attr("d", d3.line()
                    .x(function (d, i) { return xScale(d.time); })
                    .y(function (d) { return yScale(d['queue_length']); })
                );
        }
        return {
            update,
            updateTitle
        }
    }

    /**
     * @param data : data coming from the external resource
     * @param chart : reference to the chart object for updating the chart with the filtered data from the controls  
     */
    function setupControls(data, chart) {
        const dateRange = d3.select('#date-range');
        const startDate = d3.select('#start-date');
        const endDate = d3.select('#end-date');
        const endDateContainer = d3.select('#date-picker-2-container');
        document.getElementById('start-date').value = d3.timeFormat('%Y-%m-%d')(new Date());


        /**
         * keep track of the current values of the controls
         */
        let dateRangeValue = IN_LAST_DAY;
        let startDateValue = new Date();
        let endDateValue;

        dateRange.on('change', function () {
            dateRangeValue = dateRange.property('value');
            dataChanged();
        });

        startDate.on('change', function () {
            startDateValue = startDate.property('value') + " 00:00:00";
            dataChanged();
        });

        endDate.on('change', function () {
            endDateValue = endDate.property('value') + " 00:00:00";
            dataChanged();
        })

        let scaled = false;
        let scaledData;
        let nonScaledData;
        d3.select("#scaling").on('change', function () {
            scaled = d3.select(this).property('checked');
            if (scaled) {
                chart.update(scaledData, dateRangeValue)
                return;
            }
            chart.update(nonScaledData, dateRangeValue)
        })

        /**
         * 
         * @param {*} d : all the data from external resource
         */
        let minDate;
        let maxDate;
        /**
         * Called whenever there is any change to the controls
         */
        function dataChanged() {
            if (!dateRangeValue)
                return;
            // Hide the second date range if date range is not 'between'
            if (dateRangeValue !== 'between') {
                endDateContainer.style('display', 'none');
            } else {
                endDateContainer.style('display', 'inline-block');
                // if no end date has been selected, nothing can be done
                if (!endDateValue)
                    return;
            }

            // if no date has been selected, nothing can be done
            if (!startDateValue)
                return;
            let filterStartDate, filterEndDate;
            switch (dateRangeValue) {
                case IN_LAST_DAY:
                    // var currentDate = new Date(startDateValue);
                    // currentDate.setDate(currentDate.getDate() - 1);
                    filterStartDate = new Date(startDateValue);
                    filterStartDate.setHours(0, 0, 0, 0);
                    console.log(filterStartDate, startDateValue)
                    var date = moment(new Date(filterStartDate));
                    date.subtract(1, 'days');
                    filterStartDate = new Date(date)
                    filterEndDate = new Date(filterStartDate.getTime());
                    filterEndDate.setHours(23, 59, 59, 0);
                    //console.log(filterStartDate, filterEndDate, startDateValue)
                    break;
                case IN_LAST_WEEK:
                    filterEndDate = new Date(startDateValue);
                    filterEndDate.setHours(23, 59, 59, 0);
                    var date = moment(new Date(filterEndDate));
                    date.subtract(1, 'weeks');
                    date.add(1, 'seconds')
                    filterStartDate = new Date(date)
                    break;
                case IN_LAST_MONTH:
                    filterEndDate = new Date(startDateValue);
                    filterEndDate.setHours(23, 59, 59, 0);
                    var date = moment(new Date(filterEndDate));
                    date.subtract(1, 'months');
                    date.add(1, 'seconds')
                    filterStartDate = new Date(date)
                    break;
                case IN_LAST_YEAR:
                    filterEndDate = new Date(startDateValue);
                    filterEndDate.setHours(23, 59, 59, 0);
                    var date = moment(new Date(filterEndDate));
                    date.subtract(1, 'years');
                    date.add(1, 'seconds')
                    filterStartDate = new Date(date)
                    break;
                case BEFORE:
                    filterStartDate = minDate;
                    filterEndDate = new Date(startDateValue);
                    filterEndDate.setHours(23, 59, 59, 0);
                    break;
                case AFTER:
                    filterEndDate = maxDate;
                    filterStartDate = new Date(startDateValue);
                    filterStartDate.setHours(0, 0, 0, 0);
                    break;
                case BETWEEN:
                    filterStartDate = new Date(startDateValue);
                    filterStartDate.setHours(23, 59, 59, 0);
                    filterEndDate = new Date(endDateValue);
                    filterEndDate.setHours(0, 0, 0, 0);
            }
            chart.updateTitle(`Processing Load between <strong>${formatDate(filterStartDate)}</strong> and <strong> ${formatDate(filterEndDate)} </strong>`)
            chart.update(extractData(dateRangeValue, filterStartDate, filterEndDate), dateRangeValue);
        }

        function extractData(dateRange, startTime, endTime) {
            //calculate the minutes between date
            let endTimeTimer = endTime;
            let dataWithinRange = getAllDataWithinRange(startTime, endTime);
            let allPartitions = {};
            let partitionStartTime = getPartition(startTime, dateRange);
            while (time(partitionStartTime) < time(endTimeTimer)) {
                const nodesStartValue = {};
                nodes.forEach(n => {
                    nodesStartValue[n] = 0
                })
                allPartitions[partitionStartTime] = {
                    time: partitionStartTime,
                    queue_length: 0,
                    ...nodesStartValue
                };
                partitionStartTime = nextTime(dateRange, partitionStartTime)
            }
            let data = [];
            //group the data by node
            const groupedData = d3.nest().key(function (d) {
                const queuedTime = d.progress.queuedTime;
                if (!minDate)
                    minDate = queuedTime;
                if (time(queuedTime) < time(minDate)) {
                    minDate = queuedTime;
                }
                if (!maxDate)
                    maxDate = minDate;
                const endTime = d.progress.endTime;
                if (time(endTime) > time(maxDate)) {
                    maxDate = endTime;
                }
                return d.executionConstraints.processingNode
            }).entries(dataWithinRange);
            // count the timer for each node
            groupedData.forEach(d => {
                const { key, values } = d;
                values.forEach(e => {
                    const { progress } = e;
                    const { queuedTime, startTime, endTime } = progress;
                    let queueTimer = queuedTime;
                    let startTimeTimer = startTime;
                    if (time(queueTimer) <= time(startTimeTimer)) {
                        allPartitions[getPartition(queueTimer, dateRange)]['queue_length']++;
                    }
                    while (time(queueTimer) <= time(startTimeTimer)) {
                        queueTimer = new Date(queueTimer.getTime() + 1000 * 60);
                    }

                    //calculate the time for the current node;
                    let endTimeTimer = endTime;
                    while (time(startTimeTimer) <= time(endTimeTimer)) {
                        allPartitions[getPartition(startTimeTimer, dateRange)][key]++;
                        startTimeTimer = new Date(startTimeTimer.getTime() + 1000 * 60);
                    }
                })
            });
            data = Object.values(allPartitions);
            data.sort((a, b) => time(a.time) - time(b.time));
            if (dataWithinRange < 1)
                return [];
            nonScaledData = Object.assign([], data);
            if (data.length > 0) {
                data = data.filter(d => {
                    let sum = d['queue_length'];
                    nodes.forEach(n => {
                        sum += d[n];
                    })
                    return sum > 0
                })
            }
            scaledData = Object.assign([], data);
            if (!scaled)
                return nonScaledData;
            return data;
        }

        function getAllDataWithinRange(sTime, eTime) {
            return data.filter(d => {
                const queuedTime = time(d.progress.queuedTime);
                const queueTimeWithin = (sTime <= queuedTime && queuedTime <= eTime);
                const startTime = time(d.progress.startTime);
                const startTimeWithin = (sTime <= startTime && startTime <= eTime);
                const endTime = time(d.progress.endTime);
                const endTimeWithin = (sTime <= endTime && endTime <= eTime);
                return queueTimeWithin || startTimeWithin || endTimeWithin;
            });
        }

        function getPartition(time, dateRangeValue) {
            var currentDate = new Date(time);
            switch (dateRangeValue) {
                case IN_LAST_DAY:
                    currentDate.setSeconds(0);
                    return currentDate;
                case IN_LAST_WEEK:
                    currentDate.setSeconds(0);
                    currentDate.setMinutes(0);
                    return currentDate;
                case IN_LAST_MONTH:
                    currentDate.setSeconds(0);
                    currentDate.setMinutes(0);
                    currentDate.setHours(0);
                    return currentDate;
                case IN_LAST_YEAR:
                    currentDate.setSeconds(0);
                    currentDate.setMinutes(0);
                    currentDate.setHours(0);
                    currentDate.setDate(1);
                    return currentDate;
                case BEFORE:
                    currentDate.setSeconds(0);
                    currentDate.setMinutes(0);
                    currentDate.setHours(0);
                    return currentDate;
                case AFTER:
                    currentDate.setSeconds(0);
                    currentDate.setMinutes(0);
                    currentDate.setHours(0);
                    return currentDate;
                case BETWEEN:
                    currentDate.setSeconds(0);
                    currentDate.setMinutes(0);
                    currentDate.setHours(0);
                    return currentDate;
            }
        }

        function nextTime(dateRange, time) {
            switch (dateRangeValue) {
                case IN_LAST_DAY:
                    return new Date(time.getTime() + 1000 * 60);
                case IN_LAST_WEEK:
                    return new Date(time.getTime() + 1000 * 60 * 60);
                case IN_LAST_MONTH:
                    var date = new Date(time);
                    date.setDate(date.getDate() + 1);
                    return date;
                case IN_LAST_YEAR:
                    var date = moment(new Date(time));
                    date.add(1, 'months');
                    return new Date(date);
                case BEFORE:
                    var date = new Date(time);
                    date.setDate(date.getDate() + 1);
                    return date;
                case AFTER:
                    var date = new Date(time);
                    date.setDate(date.getDate() + 1);
                    return date;
                case BETWEEN:
                    var date = new Date(time);
                    date.setDate(date.getDate() + 1);
                    return date;
            }
        }

        function formatDate(date) {
            return d3.timeFormat('%m/%d/%y')(date);
        }

        function time(date) {
            return date.getTime();
        }
        dataChanged()
    }
})()
