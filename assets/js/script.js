/* globals d3 $ */

(function () {
  $.ajax({
    type: 'GET',
    url: 'milledRiceEndingStocks.csv',
    success: function (raw) {
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

      var initWidth = _getDynamicWidth()

      var svg = d3.select('.container')
                  .append('svg')
                  .attr('width', width + margin.left + margin.right)
                  .attr('height', height + margin.top + margin.bottom)
                  .append('g')
                  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

      // set X and Y scales
      var xScale = d3.scaleLinear()
                     .range([0, initWidth])
                     .domain(d3.extent(data, function (d) {
                       return d.year
                     }))

      var yScale = d3.scaleLinear()
                     // provide allowance for axis label
                     .range([height, _isMobile() ? 70 : 20])
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

      // label for yAxis
      svg.append('g')
         .append('text')
         .text('Thousand metric tonnes')
         .attr('transform', 'translate(-' + margin.left + ',0)')

      // initialise legend, tooltip, focus indicators
      var indicators = ['Vietnam', 'India', 'Thailand']

      // i. legend
      svg.append('g')
          .attr('class', 'legend')
          .append('text')
          .text('Click to hide/show')

      var legendYear = svg.select('.legend')
                          .append('text')
                          .attr('class', 'focusValue')
                          .attr('transform', 'translate(0, 20)')

      var lineLegend = svg.select('.legend')
                          .selectAll('.legendLine')
                          .data(indicators)
                          .enter()
                          .append('g')
                          .attr('class', 'legendLine')
                          .on('click', function (d) {
                            var country = d.toLowerCase()
                            var self = d3.select(this)

                            // blur legend key
                            self.transition()
                                .style('opacity', visState[country] ? '0.5' : '1')

                            // toggle line visibility
                            toggleCountryDisplay(country)
                            hideFocus()

                            // re-render charts
                            redraw(data)
                          })

      lineLegend.append('text')
                .text(function (d) {
                  return d
                })
                .attr('transform', 'translate(20,9)')

      lineLegend.append('rect')
                .attr('class', function (d) {
                  return d.toLowerCase()
                })
                .attr('width', 15)
                .attr('height', 2)

      lineLegend.append('text')
                .attr('class', function (d) {
                  return d.toLowerCase() + ' countryValue focusValue'
                })
                .attr('transform', 'translate(20,25)')

      // ii. focus points, line indicator, focus overlay
      var focus = svg.selectAll('.focus')
                     .data(indicators)
                     .enter()
                     .append('g')
                     .attr('class', function (d) {
                       return 'focus ' + d.toLowerCase()
                     })

      focus.append('circle')
           .attr('r', 4.5)

      var overlay = svg.append('rect')
                       .attr('class', 'overlay')
                       .attr('width', initWidth)
                       .on('click', handleFocus)

      var focusLine = svg.append('rect')
                         .attr('class', 'focusLine')

      // iii. tooltip (for mobile)
      var tooltip = svg.append('g')
                       .attr('class', 'tooltip')

      tooltip.append('rect')
             .attr('class', 'tooltip-border')
             .attr('width', 160)
             .attr('height', 80)

      tooltip.append('text')
             .attr('id', 'tooltip-year')
             .text('year')
             .attr('transform', 'translate(10,15)')

      var tooltipElements = tooltip.selectAll('.tooltip-countries')
                                 .data(indicators)
                                 .enter()
                                 .append('g')
                                 .attr('class', 'tooltip-countries')
                                 .attr('transform', function (d, i) {
                                   return 'translate(0' + ',' + (i + 2) * 15 + ')'
                                 })

      tooltipElements.append('text')
                     .text(function (d) {
                       return d
                     })
                     .attr('transform', 'translate(30,9)')

      tooltipElements.append('rect')
                     .attr('class', function (d) {
                       return d.toLowerCase()
                     })
                     .attr('width', 15)
                     .attr('height', 2)
                     .attr('transform', 'translate(10, 0)')

      tooltipElements.append('text')
                     .attr('class', function (d) {
                       return d.toLowerCase() + ' countryValue focusValue'
                     })
                     .attr('transform', function (d, i) {
                       return 'translate(90,9)'
                     })

      // define valueline then initialise charts
      var valueline = d3.line()
                        .x(function (d) { return xScale(d.year) })
                        .y(function (d) { return yScale(d.value) })

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

      // responsivefy
      $(window).on('resize', function () {
        redraw(data)
      })

      redraw(data)

      // --------------------------------------------------------------
      // helper functions
      // --------------------------------------------------------------
      function redraw (dataset, resize = false) {
        // redraws chart on user interaction (resize, click)
        // called immediately after initialisation to set css properties

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

        hideFocus()
        resizeX()
        resizeY(res)

        // redefine valueline in response to changing y-axis
        var newline = d3.line()
                        .x(function (d) { return xScale(d.year) })
                        .y(function (d) { return yScale(d.value) })

        var currentData = sortDataByCountry(dataset)

        // re-render chart lines
        currentData.forEach(function (datum) {
          svg.select('#' + datum.country)
             .select('path')
             .transition()
             .duration(800)
             .attr('d', function (d) {
               return newline(d.values)
             })
        })
      }

      function moveLegend (currentWidth) {
        // move legend based on current screen size
        var legend = svg.select('.legend')

        if (_isMobile()) {
          // move legend to top of chart
          legend.attr('transform', 'translate(' + -margin.left + ', 20)')
          lineLegend.attr('transform', function (d, i) {
            // sets legendLines sideways
            var dx = (i * 3 * margin.left)
            return 'translate(' + dx + ', 20)'
          })
        } else {
          // move legend to right hand side
          legend.attr('transform', 'translate(' + (currentWidth + 10) + ', 15)')
          lineLegend.attr('transform', function (d, i) {
            // sets legendLines on top of each other
            return 'translate(0' + ',' + (i * 2 + 2) * 20 + ')'
          })
        }
      }

      function customXAxis (g) {
        g.call(d3.axisBottom(xScale)
                 .ticks(_isMobile() ? 3 : 5)
                 .tickFormat(function (d, i) {
                   if (i === 0) return ''
                   return d
                 })
               )

        var x = svg.select('.x')

        x.select('.tick')
         .style('display', 'none')

        x.select('.domain')
         .style('display', 'none')

        if (_unselectAll()) {
          x.style('display', 'none')
        } else {
          x.style('display', 'block')
        }
      }

      function customYAxis (g) {
        var tickLength = _getDynamicWidth('ticks')
        g.call(d3.axisLeft(yScale)
                 .tickSize(tickLength)
               )
         .selectAll('.tick line')
         .attr('transform', 'translate(-' + margin.left + ',0)')
        svg.select('.y .domain')
          .style('visibility', 'hidden')
        g.selectAll('.tick text')
         .attr('x', -10)
         .attr('dy', -4)
      }

      function handleFocus () {
        // display focus indicators (depending on screen size)
        var mouseX = d3.mouse(this)[0]
        var mouseY = d3.mouse(this)[1]

        // identify closest year and retrieve rice records
        var x0 = Math.round(xScale.invert(mouseX))
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

        // update indicator values (all screen sizes)
        focusData.forEach(function (point) {
          svg.select('.focus.' + point.country)
             .style('display', visState[point.country] ? 'block' : 'none')
             .select('circle')
             .attr('transform', 'translate(' + xScale(x0) + ',' + yScale(point.value) + ')')

          svg.select('.countryValue.' + point.country)
             .text(point.value)

          svg.select('.tooltip-countries .countryValue.' + point.country)
             .text(point.value)
        })

        // toggle legend/tooltip indicator display
        // if country is un-selected, hide relevant indicator
        var legendFocusValues = svg.selectAll('.legendLine > .focusValue')

        if (_isMobile()) {
          focusLine.attr('height', height - 60)
                   .attr('transform', 'translate(' + xScale(x0) + ',60)')
                   .style('display', 'block')

          legendFocusValues.style('display', 'none')
          legendYear.text(x0)
                    .style('display', 'none')

          tooltip.style('display', 'block')
                 .attr('transform', function (d) {
                   var displaceX = 0
                   var displaceY = 0
                   var containerWidth = _getDynamicWidth()
                   if (mouseX + 160 > containerWidth) {
                     displaceX = mouseX - containerWidth * 1 / 2
                   } else {
                     displaceX = 1.1 * mouseX
                   }

                   if (mouseY + 80 > height) {
                     displaceY = height - 80
                   } else {
                     displaceY = mouseY
                   }

                   return 'translate(' + displaceX + ',' + displaceY + ')'
                 })
          svg.selectAll('.tooltip-countries .focusValue')
              .style('display', function (d) {
                return visState[d.toLowerCase()] ? 'block' : 'none'
              })
          svg.select('#tooltip-year').text(x0)
        } else {
          focusLine.attr('height', height - 10)
                   .attr('transform', 'translate(' + xScale(x0) + ',10)')
                   .style('display', 'block')

          legendFocusValues.style('display', function (d) {
            return visState[d.toLowerCase()] ? 'block' : 'none'
          })

          tooltip.style('display', 'none')
          legendYear.text(x0)
                    .style('display', 'block')
        }
      }

      function hideFocus () {
        focus.style('display', 'none')
        focusLine.style('display', 'none')

        legendYear.style('display', 'none')
        svg.selectAll('.legendLine > .focusValue')
           .style('display', 'none')

        tooltip.style('display', 'none')
      }

      function toggleCountryDisplay (countryName) {
        // hides selected country line and focus indicators, blurs out country legend
        var line = svg.select('#' + countryName)

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

      function resizeX () {
        // resize chart laterally
        var newChartWidth = _getDynamicWidth()

        xScale.range([0, newChartWidth])
              .domain(d3.extent(data, function (d) {
                return d.year
              }))

        svg.select('.x')
           .transition()
           .duration(800)
           .call(customXAxis)

        moveLegend(newChartWidth)
        overlay.attr('width', newChartWidth)
      }

      function resizeY (dataset) {
        // resize chart horizontally
        if (_isMobile()) {
          yScale.range([height, 70])
          overlay.attr('height', height - 60)
                 .attr('transform', 'translate(0, 60)')
        } else {
          yScale.range([height, 20])
          overlay.attr('height', height - 10)
                 .attr('transform', 'translate(0, 10)')
        }

        // rescale y axis
        yScale.domain([0, d3.max(dataset, function (d) {
          return _yMax(d)
        })])

        svg.select('.y')
           .transition()
           .duration(800)
           .call(customYAxis)
      }

      function parse (csv) {
        const idx = {
          vietnam: 0,
          india: 1,
          thailand: 2
        }
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
        return Math.max(...yearlyCounts) * 1.3
      }

      function _getDynamicWidth (getTickWidth = false) {
        // calculates chart width for current screen size
        var containerWidth = document.querySelector('.container').clientWidth
        var dynamicWidth

        if (containerWidth < 750 && containerWidth > 450) {
          dynamicWidth = containerWidth - width * 0.17 - margin.left - margin.right
        } else if (containerWidth >= 750) {
          dynamicWidth = width * 0.83
        } else {
          dynamicWidth = 450 - width * 0.17
        }

        if (getTickWidth) {
          dynamicWidth = -dynamicWidth - margin.left
        }

        return dynamicWidth
      }

      function _isMobile () {
        var containerWidth = document.querySelector('.container').clientWidth
        if (containerWidth < 450) {
          return true
        }
        return false
      }

      function _unselectAll () {
        for (var country in visState) {
          if (visState[country]) return false
        }
        return true
      }
    }
  })
}())
