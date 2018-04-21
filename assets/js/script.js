/* globals d3 $ */

(function () {
  $.ajax({
    type: 'GET',
    url: 'milledRiceEndingStocks.csv',
    success: function (raw) {
      const idx = {
        vietnam: 0,
        india: 1,
        thailand: 2
      }

      // const colors = {
      //   india: '#FABE9C',
      //   vietnam: '#FED47D',
      //   thailand: '#F6AB9A'
      // }

      const visState = {
        india: true,
        vietnam: true,
        thailand: true
      }

      var data = parse(raw, visState)
      var countries = sortDataByCountry(data, visState)
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
                     .domain(d3.extent(data, function (d) {
                       return d.year
                     }))

      var yScale = d3.scaleLinear()
                     .range([height, 0])
                     .domain([0, d3.max(data, function (d) {
                       return _yMax(d)
                     })])
                     .nice()

      // Add X and Y Axes
      svg.append('g')
         .attr('transform', 'translate(0,' + height + ')')
         .attr('class', 'x')
         .call(customXAxis)

      svg.append('g')
         .attr('class', 'y')
         .call(customYAxis)

      var valueline = d3.line()
                        .x(function (d) { return xScale(d.year) })
                        .y(function (d) { return yScale(d.value) })

      var indicators = ['Vietnam', 'India', 'Thailand']

      svg.append('g')
         .attr('class', 'legend')
         .attr('transform', 'translate(' + (width * 0.83 + 10) + ', 0)')
         .append('text')
         .text('Click to hide/show')

      var legendYear = svg.select('.legend')
                          .append('text')
                          .attr('transform', 'translate(0, 20)')

      var lineLegend = svg.select('.legend')
                          .selectAll('.legendLine')
                          .data(indicators)
                          .enter()
                          .append('g')
                          .attr('class', 'legendLine')
                          .attr('transform', function (d, i) {
                            return 'translate(0' + ',' + (i * 2 + 2) * 20 + ')'
                          })
                          .on('click', function (d) {
                            var country = d.toLowerCase()
                            var self = d3.select(this)

                            // blur legend key
                            self.transition()
                                .style('opacity', visState[country] ? '0.5' : '1')

                            // toggle line visibility
                            toggleDisplay(country)
                            hideFocus()

                            // re-render charts
                            redraw(data, visState)
                          })

      lineLegend.append('text')
                .text(function (d) {
                  return d
                })
                .attr('transform', 'translate(20,9)')

      lineLegend.append('rect')
                // .attr('fill', function (d, i) {
                //   return colors[d.toLowerCase()]
                // })
                .attr('class', function (d) {
                  return d.toLowerCase()
                })
                .attr('width', 15)
                .attr('height', 2)

      lineLegend.append('text')
                .attr('class', function (d) {
                  return d.toLowerCase() + ' countryValue'
                })
                .attr('transform', 'translate(20,25)')

      var focus = svg.selectAll('.focus')
                     .data(indicators)
                     .enter()
                     .append('g')
                     .attr('class', function (d) {
                       return 'focus ' + d.toLowerCase()
                     })
                     .style('display', 'none')

      focus.append('circle')
           .attr('r', 4.5)

      svg.append('rect')
         .attr('class', 'overlay')
         .attr('width', width * 0.83)
         .attr('height', height)
         .on('click', handleFocus)

      var focusLine = svg.append('rect')
                         .attr('class', 'focusLine')
                         .attr('height', height)
                         .style('display', 'none')

      // initialise charts
      var chart = svg.selectAll('.country')
                     .data(countries)
                     .enter()
                     .append('g')
                     .attr('id', function (d) {
                       return d.country
                     })
                     .attr('class', 'country')

      chart.append('path')
           .attr('class', function (d) {
             return 'line ' + d.country
           })
           .attr('d', function (d) {
             return valueline(d.values)
           })

      // helpers
      // function initCharts (dataset, chartGroup) {
      //   var chart = chartGroup.selectAll('.country')
      //                         .data(dataset)
      //                         .enter()
      //                         .append('g')
      //                         .attr('id', function (d) {
      //                           return d.country
      //                         })
      //                         .attr('class', 'country')
      //
      //   chart.append('path')
      //        .attr('class', function (d) {
      //          return 'line ' + d.country
      //        })
      //        .attr('d', function (d) {
      //          return valueline(d.values)
      //        })
      //        // .style('stroke', function (d) {
      //        //   return colors[d.country]
      //        // })
      // }

      function redraw (dataset) {
        // filter hidden countries
        var res = dataset.map(function (d) {
          var obj = {}
          obj.year = d.year
          for (var country in visState) {
            if (visState[country]) {
              obj[country] = d[country]
            }
          }
          return obj
        })

        // rescale y axis
        yScale.domain([0, d3.max(res, function (d) {
          return _yMax(d)
        })])

        svg.select('.y')
           .transition()
           .duration(800)
           .call(customYAxis)

        // redefine valueline in response to changing y-axis
        var newline = d3.line()
                        .x(function (d) { return xScale(d.year) })
                        .y(function (d) { return yScale(d.value) })

        var currentData = sortDataByCountry(dataset)

        currentData.forEach(function (datum) {
          d3.select('#' + datum.country)
            .select('path')
            .transition()
            .duration(800)
            .attr('d', function (d) {
              return newline(d.values)
            })
        })

        handleFocus()
      }

      function customXAxis (g) {
        g.call(d3.axisBottom(xScale)
                 .ticks(5)
                 .tickFormat(d3.format(''))
               )
      }

      function customYAxis (g) {
        g.call(d3.axisLeft(yScale)
                 .tickSize(-width * 0.83 - margin.left)
                 .ticks(6)
               )
         .selectAll('.tick line')
         .attr('transform', 'translate(-' + margin.left + ',0)')
        d3.select('.y')
          .select('.domain')
          .remove()
        g.selectAll('.tick text')
         .attr('x', -10)
         .attr('dy', -4)
      }

      function handleFocus () {
        var x0 = Math.round(xScale.invert(d3.mouse(this)[0]))
        var index = d3.bisector(function (d) {
          return d.year
        }).left(data, x0, 1)

        var record = data[index]
        var focusData = []
        for (var key in record) {
          if (key !== 'year') {
            focusData.push({
              country: key,
              value: record[key]
            })
          }
        }

        focusData.forEach(function (point) {
          svg.select('.focus.' + point.country)
             .style('display', visState[point.country] ? 'block' : 'none')
             .select('circle')
             .attr('transform', 'translate(' + xScale(x0) + ',' + yScale(point.value) + ')')

          svg.select('.countryValue.' + point.country)
             .style('display', visState[point.country] ? 'block' : 'none')
             .text(point.value)
        })

        focusLine.attr('transform', 'translate(' + xScale(x0) + ',0)')
                 .style('display', 'block')

        legendYear.text(x0)
      }

      function hideFocus () {
        focus.style('display', 'none')
        focusLine.style('display', 'none')

        svg.selectAll('.countryValue')
           .style('display', 'none')
      }

      function toggleDisplay (countryName) {
        // hides selected country line and focus indicators, blurs out country legend
        var line = d3.select('#' + countryName)

        visState[countryName] = !visState[countryName]

        if (visState[countryName]) {
          line.style('opacity', '0')
              .transition()
              .duration(1600)
              .style('opacity', '1')
              .style('display', 'block')
        } else {
          line.transition()
              .duration(800)
              .style('display', 'none')
        }
      }

      function parse (csv) {
        var copy = csv
        var rows = copy.split('\n')
        // remove headers and empty last row
        rows.shift()
        rows.pop()

        var parsed = rows.map(function (row) {
          var dataObject = {}
          row = row.split(',')
          dataObject.year = +row[0]

          for (var country in visState) {
            if (visState[country]) {
              dataObject[country] = +row[idx[country] + 1]
            }
          }
          return dataObject
        })

        return parsed
      }

      function sortDataByCountry (dataset) {
        var countryDataset = []
        for (var country in visState) {
          if (visState[country]) {
            countryDataset.push({
              country: country,
              values: []
            })
          }
        }

        dataset.map(function (yearlyRecord) {
          countryDataset.forEach(function (element) {
            // var rec = {}
            // rec.year = yearlyRecord.year
            // rec.value = yearlyRecord[element.country]
            // element.values.push(rec)
            element.values.push({
              year: yearlyRecord.year,
              value: yearlyRecord[element.country]
            })
          })
        })
        return countryDataset
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
