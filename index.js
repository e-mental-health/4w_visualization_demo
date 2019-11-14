const svg = d3.select('svg');

const width = +svg.attr('width');
const height = +svg.attr('height');

let data;

let xlabel = "polarity";
let ylabel = "subjectivity";
let markerLabel = "nr_tokens";
const optionScaleRel = "Relative to token counts (%)"
const optionScaleCounts = "Number of counts"
const scaleOptions = [optionScaleRel, optionScaleCounts];
let scaleChoice = optionScaleCounts;

// Hard coded column names
const scaleColumn = "nr_tokens";
const dateColumn = "Date";
const senderColumn = "Sender";
const receiverColumn = "Receiver";
const subjectColumn = "Subject";
const textColumn = "Text";
const textAnnotatedColumn = "Text_annotated";


let minMarkerSize = 4;
let maxMarkerSize = 12;
let keyMarkerSizeOff = 'off';
let offMarkerSize = 4;
var labels = [];
let nonNumCols = [];

let file = "demo_data_4wviz.csv"

const parseDateTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
let senders = [];

/******************
*** LOAD DATA *****
*******************/
svg.selectAll("*").remove();
if (file) {
    d3.csv(file)
        .then(function(loadedData) {
            data = loadedData;
            data.forEach( (d,i) => {
                d.time = parseDateTime(d.Date).getTime();

                let senderId = senders.indexOf(d.Sender);
                if (senderId == -1) {
                    senders.push(d.Sender);
                    senderId = senders.length - 1;
                }
                d.sender_id = senderId;

                for (let [key, value] of Object.entries(d)) {
                    // We check if it is not a number
                    if (!(value == parseFloat(value, 10))){
                        if (Object.keys(nonNumCols).indexOf(key) === -1){
                            nonNumCols[key] = [value];
                        }else{
                            nonNumCols[key].push(value);
                        }
                        // Remove the non number column
                        delete(d[key]);
                    } else {
                        // If the column does contain numbers
                        // we convert them to floats
                        d[key] = parseFloat(value);
                    }
                }
                d[keyMarkerSizeOff] = offMarkerSize;
            });

//                var xlabel = "i";
//                var ylabel = "they";

            render();
        });

};

/******************
*** RENDER LOOP ***
*******************/
const render = () => {
    var zipped = [];
    labels = [];
    
    // Make the graph control labels
    d3.selectAll('.menuItemText')
        .data(["y", "scale", "x", "marker"])
        .text(d => d);
    
    // Make the different graph controls
    d3.select('#menuX')
        .call(dropdownMenu, {
            options: Object.keys(data[0]),
            onOptionClicked: onXColumnClicked,
            selectedOption: xlabel
    });

    d3.select('#menuY')
        .call(dropdownMenu, {
            options: Object.keys(data[0]),
            onOptionClicked: onYColumnClicked,
            selectedOption: ylabel
    });
    
    d3.select('#menuMarker')
        .call(dropdownMenu, {
            options: Object.keys(data[0]),
            onOptionClicked: onMarkerOptionsClicked,
            selectedOption: markerLabel
    });
    
    d3.select('#menuScale')
        .call(dropdownMenu, {
            options: scaleOptions,
            onOptionClicked: onScaleOptionsClicked,
            selectedOption: scaleChoice
    });


    // Prepare the data for plotting
    data.map(function(d){
        var x = d[xlabel];
        var y = d[ylabel];
        var m = d[markerLabel];
        if (scaleChoice == optionScaleRel){
            var scale = d[scaleColumn];
            
            zipped.push([100*x/scale, 
                         100*y/scale, 
                         100*m/scale]);
            labels.push("("+ parseFloat(100*x/scale).toFixed(2) +", "+
                        parseFloat(100*y/scale).toFixed(2)+")");
        } else {
            zipped.push([x, 
                        y, 
                        m]);
            labels.push("("+x.toFixed(2)+", "+y.toFixed(2)+")");
        }
    });
    
    // Call the plotting function
    svg.call( makeScatterPlot, {
        xAxisLabel: xlabel,
        yAxisLabel: ylabel,
        mAxisLabel: markerLabel,
        margin: { top: 10, right: 40, bottom: 80, left: 110 },
        width,
        height,
        data_zipped:zipped,
        tooltips:labels
    });
};



var dropdownMenu = (selection, props) => {
    const {
        options,
        onOptionClicked,
        selectedOption
    } = props;
    
    let select = selection.selectAll('select').data([null]);
    select = select.enter().append('select')
        .merge(select)
        .on('change', function() {
            onOptionClicked(this.value);
        });
    
    const option = select.selectAll('option').data(options);
    option.enter()
        .append('option')
        .merge(option)
        .attr('value', d => d)
        .property('selected', d => d === selectedOption)
        .text(d => d);
};


const onXColumnClicked = column => {
    xlabel=column;
    render();
};

const onYColumnClicked = column => {
    ylabel=column;
    render();
};

const onMarkerOptionsClicked = column => {
    markerLabel=column;
    render();
};

const onScaleOptionsClicked = column => {
    scaleChoice=column;
    render();
};

const makeScatterPlot = (selection, props) => {
    const {
        xAxisLabel,
        yAxisLabel,
        mAxisLabel,
        margin,
        width,
        height,
        data_zipped,
        tooltips
    } = props;
  
    div = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("opacity", 0);

    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
  
    // SCALES
    const xScale = d3.scaleLinear()
        .domain([d3.min(data_zipped, function(d) { return parseFloat(d[0]);}), 
                 d3.max(data_zipped, function(d) { return parseFloat(d[0]); })])
        .range([0, innerWidth])
        .nice();
  
    const yScale = d3.scaleLinear()
        .domain([d3.min(data_zipped, function (d) { return parseFloat(d[1]); }), 
                 d3.max(data_zipped, function (d) { return parseFloat(d[1]); })])
        .range([innerHeight, 0])
        .nice();
    
    const mScale = d3.scaleLinear()
        .domain([d3.min(data_zipped, function (d) { return parseFloat(d[2]); }), 
                 d3.max(data_zipped, function (d) { return parseFloat(d[2]); })])
        .range([minMarkerSize, maxMarkerSize])
        .nice();
  
    const g = selection.selectAll('.container').data([null]);
    const gEnter = g
        .enter().append('g')
        .attr('class', 'container');
    gEnter
        .merge(g)
        .attr('transform',
            `translate(${margin.left},${margin.top})`
        );
  
    //Y-axis
    const yAxis = d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickPadding(10);
    const yAxisG = g.select('.y-axis');
    const yAxisGEnter = gEnter
        .append('g')
        .attr('class', 'y-axis');
    yAxisG
        .merge(yAxisGEnter)
        .call(yAxis)
        .selectAll('.domain').remove();
  
    // Y-axis label
    const yAxisLabelText = yAxisGEnter
        .append('text')
        .attr('class', 'axis-label')
        .attr('y', -93)
        .attr('fill', 'black')
        .attr('transform', `rotate(-90)`)
        .attr('text-anchor', 'middle')
        .merge(yAxisG.select('.axis-label'))
        .attr('x', -innerHeight / 2)
        .text(yAxisLabel);
  
    // X-axis
    const xAxis = d3.axisBottom(xScale)
        .tickSize(-innerHeight)
        .tickPadding(15);
    const xAxisG = g.select('.x-axis');
    const xAxisGEnter = gEnter
        .append('g')
        .attr('class', 'x-axis');
    xAxisG
        .merge(xAxisGEnter)
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .selectAll('.domain').remove();
  
    // X-axis label
    const xAxisLabelText = xAxisGEnter
        .append('text')
        .attr('class', 'axis-label')
        .attr('y', 75)
        .attr('fill', 'black')
        .merge(xAxisG.select('.axis-label'))
        .attr('x', innerWidth / 2)
        .text(xAxisLabel);

    const circles = g.merge(gEnter)
        .selectAll('circle').data(data_zipped);
    circles
        .enter().append('circle')
        .attr('cx', innerWidth / 2)
        .attr('cy', innerHeight / 2)
        .attr('r', 0)
        .attr('fill', function(d, i) {
            return ("rgb(0,0,200,0.8)");
        })
        .merge(circles)
        .on("mouseover", function (d, i) {
            d3.select(this)
                .style("fill", "green");
            div.transition()
                .duration(200)
                .style("opacity", 0.9);
            div.html(tooltips[i])
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d, i) {
            d3.select(this)
                .style("fill", "rgb(0,0,200,0.8)");
            div.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function (d, i) {
        
            d3.select(this)
                .style("fill", "red");
        
            var text = "<h2>Selected data information</h2><table class='info-table'>";
            text += "<tr><td>Date</td><td>"+nonNumCols[dateColumn][i]+"</td></tr>";
            text += "<tr><td>Sender</td><td>"+nonNumCols.Sender[i]+"</td></tr>";
            text += "<tr><td>Receiver</td><td>"+nonNumCols.Receiver[i]+"</td></tr>";
            text += "<tr><td>"+xlabel+"</td><td>"+data[i][xlabel].toFixed(2)+"</td></tr>";
            text += "<tr><td>"+ylabel+"</td><td>"+data[i][ylabel].toFixed(2)+"</td></tr>";
            text += "<tr><td>"+markerLabel+"</td><td>"+data[i][markerLabel].toFixed(2)+"</td></tr>";
            text += "</table>"
            d3.select("#data-point-info-container")
                .html(text);
            
            text = "<h2>Annotated text </h2>";
            text += "<div id = \"data-point-text-field\">"+
                nonNumCols[textAnnotatedColumn][i]+"</div>";
            d3.select("#data-point-text-container")
                .html(text);    
            
            text = "<h2>List of annotations</h2><table><tr><th>Word(s)</th><th>polarity</th><th>subjectivity</th></tr>";
            for (let [indexj, row] of Object.entries(JSON.parse(nonNumCols["Annotations"][i]))) {
                text +="<tr><td>"+row[0]+"</td><td>"+row[1].toFixed(2)+"</td><td>"+row[2].toFixed(2)+"</td></tr>";
            }
            text += "</table>"
        
            d3.select("#data-point-annotations-container")
                .html(text);
        })
        .transition().duration(2000)
        .delay((d, i) => i * 10)
        .attr('cy', d => yScale(d[1]))
        .attr('cx', d => xScale(d[0]))
        .attr('r', d => {if (mAxisLabel == keyMarkerSizeOff){return offMarkerSize; }
                         else{return mScale(d[2])}  });


};