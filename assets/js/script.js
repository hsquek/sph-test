/* globals d3 $ */

(function () {
  $.ajax({
    type: 'GET',
    url: 'milledRiceEndingStocks.csv',
    success: function (raw) {
      const idx = {
        year: 0,
        vietnam: 1,
        india: 2,
        thailand: 3
      }

      const colors = {
        india: '#FABE9C',
        vietnam: '#FED47D',
        thailand: '#F6AB9A'
      }

      const visState = {
        india: true,
        vietnam: true,
        thailand: true
      }

      var data = parse(raw, visState)

      // set the dimensions and margins of the graph
      var margin = { top: 20, right: 20, bottom: 30, left: 50 }
      var width = 750 - margin.left - margin.right
      var height = 500 - margin.top - margin.bottom

      var svg = d3.select('.container')
                  .append('svg')
                  .attr('width', width + margin.left + margin.right)
                  .attr('height', height + margin.top + margin.bottom)
                  .append('g')
                  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

      // set X and Y scales
      var xScale = d3.scaleLinear()
                     .range([0, width * 0.83])
                     .domain(d3.extent(data, function (d) { return d.year }))

      var yScale = d3.scaleLinear()
                     .range([height, 0])
                     .domain([0, d3.max(data, function (d) {
                       return _yMax(d)
                     })])

      // Add X and Y Axes
      svg.append('g')
         .attr('transform', 'translate(0,' + height + ')')
         .attr('class', 'x')
         .call(d3.axisBottom(xScale).ticks(5))

      svg.append('g')
         .attr('class', 'y')
         .call(d3.axisLeft(yScale).ticks(5))

      renderCharts(data, visState, svg)

      var legendKeys = ['India', 'Vietnam', 'Thailand']

      var legend = svg.append('g')
                      .attr('class', 'legend')
                      .attr('transform', 'translate(' + (width * 0.83) + ', 0)')
                      .append('text')
                      .text('Click to hide/show')
                      .style('font-family', 'curatorBold')
                      .style('font-size', '15px')
                      .style('line-height', '21px')

      var lineLegend = svg.select('.legend')
                          .selectAll('.legendLine')
                          .data(legendKeys)
                          .enter()
                          .append('g')
                          .attr('class', 'legendLine')
                          .attr('transform', function (d, i) {
                            return 'translate(0' + ',' + (i + 1) * 20 + ')'
                          })
                          .style('cursor', 'pointer')
                          .style('font-family', 'curatorRegular')
                          .style('font-size', '15px')
                          .style('line-height', '21px')
                          .on('click', function (d) {
                            var country = d.toLowerCase()
                            var self = d3.select(this)

                            // blur legend key
                            if (visState[country]) {
                              self.transition()
                                  .style('opacity', '0.5')
                            } else {
                              self.transition()
                                  .style('opacity', '1')
                            }

                            // toggle line visibility
                            visState[country] = !visState[country]

                            // re-render charts
                            data = parse(raw, visState)
                            _updateY(data)()
                            renderCharts(data, visState, svg)
                          })

      lineLegend.append('text')
                .text(function (d) {
                  return d
                })
                .attr('transform', 'translate(20,9)')

      lineLegend.append('rect')
                .attr('fill', function (d, i) {
                  return colors[d.toLowerCase()]
                })
                .attr('width', 15)
                .attr('height', 2)

      // helper functions
      function renderCharts (dataset, isVisible, chartGroup) {
        var lines = chartGroup.selectAll('.line')
                              .transition()
                              .style('visibility', 'hidden')
                              .remove()

        for (var country in isVisible) {
          if (isVisible[country]) {
            var valueline = d3.line()
                              .x(function (d) { return xScale(d.year) })
                              .y(function (d) { return yScale(d[country]) })

            var chart = chartGroup.selectAll('svg')
                                  .data(dataset)

            chart.enter()
                 .append('path')
                 .attr('class', 'line')
                 .attr('id', country)
                 .attr('d', valueline(dataset))
                 .transition()
                 .duration(800)
                 .style('opacity', '1')
                 .style('visibility', 'visible')
                 .style('stroke-width', '2')
                 .style('stroke', colors[country])
          }
        }
      }

      function parse (csv, isVisible) {
        var rows = csv.split('\n')
        // remove header and empty last row
        rows.shift()
        rows.pop()

        var parsed = rows.map(function (row) {
          var dataObject = {}
          row = row.split(',')
          dataObject.year = +row[idx.year]

          for (var country in isVisible) {
            if (isVisible[country]) {
              dataObject[country] = +row[idx[country]]
            }
          }
          return dataObject
        })

        return parsed
      }

      function _updateY (dataset) {
        return function () {
          yScale.domain([0, d3.max(dataset, function (d) {
            return _yMax(d)
          })])

          svg.select('.y')
             .transition()
             .duration(800)
             .call(d3.axisLeft(yScale))
        }
      }

      function _yMax (d) {
        // gets the maximum value from the row
        var yearlyCounts = []
        for (var key in d) {
          if (key !== 'year') {
            yearlyCounts.push(d[key])
          }
        }
        return Math.max(...yearlyCounts)
      }
    }
  })
}())
