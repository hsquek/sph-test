/* globals d3 $ */

(function () {
  $.ajax({
    type: 'GET',
    url: 'milledRiceEndingStocks.csv',
    success: function (raw) {
      const YEAR = 0
      const VIETNAM = 1
      const INDIA = 2
      const THAILAND = 3

      const colors = {
        india: '#FABE9C',
        vietnam: '#FED47D',
        thailand: '#F6AB9A'
      }

      var rows = raw.split('\n')
      // remove header and empty last row
      rows.shift()
      rows.pop()

      var data = rows.map(function (row) {
        row = row.split(',')

        return {
          year: +row[YEAR],
          vietnam: +row[VIETNAM],
          india: +row[INDIA],
          thailand: +row[THAILAND]
        }
      })

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

      // set range for x and y values
      var x = d3.scaleLinear().range([0, width])
      var y = d3.scaleLinear().range([height, 0])

      // Scale the range of the data
      x.domain(d3.extent(data, function (d) { return d.year }))
      y.domain([0, d3.max(data, function (d) {
        return Math.max(d.vietnam, d.india, d.thailand)
      })])

      // Add the X Axis
      svg.append('g')
         .attr('transform', 'translate(0,' + height + ')')
         .call(d3.axisBottom(x))

      // Add the Y Axis
      svg.append('g')
         .call(d3.axisLeft(y))

      renderCharts(data, ['india', 'vietnam', 'thailand'], svg)

      function renderCharts (dataset, countries, chartGroup) {
        var numOfCountries = countries.length

        for (var i = 0; i < numOfCountries; i++) {
          var country = countries[i]
          var valueline = d3.line()
                            .x(function (d) { return x(d.year) })
                            .y(function (d) { return y(d[country]) })
          chartGroup.append('path')
                    .attr('class', 'line')
                    .attr('id', country)
                    .attr('d', valueline(dataset))
                    .style('stroke', colors[country])
        }
      }
    }
  })
}())
