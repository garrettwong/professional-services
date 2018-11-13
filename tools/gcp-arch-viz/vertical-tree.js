function initVerticalTree(filename) {
    d3.text(FILENAME).then(function (text) {
        var FILE_LOAD_END_TIME = new Date().toLocaleTimeString();
        console.log("CSV loaded: " + FILE_LOAD_END_TIME);

        csv_data = text;
        console.log(csv_data);

        i = 0, duration = 750;

        // set the dimensions and margins of the diagram
        var margin = {
            top: 20,
            right: 45,
            bottom: 30,
            left: 150
        };

        // Use the parsed tree data to dynamically create height & width
        var width = 1500 - margin.left - margin.right,
            height = 940 - margin.top - margin.bottom;

        tree = d3.tree().size([height, width]);

        table = d3.csvParseRows(csv_data, function (d, i) {
            return {
                // NOTE: This stuff is VERY tightly coupled to the format of the inventory data export. 
                //       Because there are no headers in the CSV export file, the column order is
                //       extremely important and needs to be carefully paid attention to.        
                id: d[0],
                resource_type: d[1],
                category: d[2],
                resource_id: d[3],
                parent_id: (d[1] == 'organization' ? "" : d[4]),
                resource_name: (d[5] != '' ? d[5] : d[6]),
                image: getImageURL(d[1])
            };
        });

        console.log(table);

        treeData = d3.stratify()
            .id(function (d) {
                return d.id;
            })
            .parentId(function (d) {
                return d.parent_id;
            })
            (table);

        // assign the name to each node
        treeData.each(function (d) {
            d.name = d.data.resource_name;
        });

        // treeData is the root of the tree,
        // and the tree has all the data we need in it now.
        // let's draw that thing...
        console.log(treeData);

        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        svg = d3.select("body").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        g = svg.append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");


        // Collapse after the second level
        // TODO(mzinni):  enable this after folders & projects have color-coded indicators 
        //                of children/no-children
        treeData.children.forEach(collapse);
        update(treeData);
    });

    var i = 0;

    function update(source) {
        tree(treeData);

        treeData.each(function (d) {
            d.y = d.depth * 180;
        });

        var node = g.selectAll('.node')
            .data(treeData.descendants(), function (d) {
                return d.id || (d.id = ++i);
            });

        var nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + source.x + "," + source.y + ")";
            })
            .on("click", function (d) {
                toggle(d);
                update(d);
            });

        nodeEnter.append("circle")
            .attr("r", 22)
            .style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            })
            .style("fill-opacity", function (d) {
                return d._children ? 1 : 0;
            })
            .style("stroke", "white")
            .style("stroke-opacity", 0);

        // adds the image to the node
        nodeEnter.append("image")
            .attr("xlink:href", function (d) {
                return d.data.image;
            })
            .attr("x", function (d) {
                return -16;
            })
            .attr("y", function (d) {
                return -16;
            })
            .attr("height", 35)
            .attr("width", 35);

        // adds the text to the node
        nodeEnter.append("text")
            .attr("x", function (d) {
                return d.children ? -25 : 25;
            })
            .attr("dy", ".35em")
            .style("text-anchor", function (d) {
                return d.children ? "end" : "start";
            })

            .attr("transform", "translate(0,0) rotate(-45)")
            .text(function (d) {
                return d.name;
            });

        var nodeUpdate = nodeEnter.merge(node);
        var ANIMATION_DURATION_MS = 500;

        nodeUpdate.transition()
            .duration(ANIMATION_DURATION_MS)
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

        nodeUpdate.select("circle")
            .attr("r", 22)
            .style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            })
            .style("fill-opacity", function (d) {
                return d._children ? 1 : 0;
            })
            .style("stroke-opacity", 0);

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        var nodeExit = node
            .exit()
            .transition()
            .duration(ANIMATION_DURATION_MS)
            .attr("transform", function (d) {
                return "translate(" + source.x + "," + source.y + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        var link = g.selectAll(".link")
            .data(treeData.links(), function (d) {
                return d.target.id;
            });

        var linkEnter = link.enter().insert('path', "g")
            .attr("class", "link")
            .attr("d", d3.linkHorizontal()
                .x(function (d) {
                    return source.x;
                })
                .y(function (d) {
                    return source.y;
                }));

        var linkUpdate = linkEnter.merge(link);
        linkUpdate
            .transition()
            .duration(ANIMATION_DURATION_MS)
            .attr("d", d3.linkHorizontal()
                .x(function (d) {
                    return d.x;
                })
                .y(function (d) {
                    return d.y;
                }));

        link
            .exit()
            .transition()
            .duration(ANIMATION_DURATION_MS)
            .attr("d", d3.linkHorizontal()
                .x(function (d) {
                    return source.x;
                })
                .y(function (d) {
                    return source.y;
                })
            )
            .remove();

        node.each(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Collapse the node and all it's children
    function collapse(node) {
        if (node.children) {
            node._children = node.children
            node._children.forEach(collapse)
            node.children = null
        }
    }

    // Toggle children on click.
    function toggle(node) {
        if (node.children) {
            node._children = node.children;
            node.children = null;
        } else {
            node.children = node._children;
            node._children = null;
        }
        update(node);
    }
}

function getImageURL(resource_type) {
    var URL_BASE = "https://storage.googleapis.com/mps-storage/mzinni/external/gcp-arch-viz-images/";
    var imageFilename = "gcp-logo.png";

    switch (resource_type) {
        case "organization":
            imageFilename = "cloud_logo.png";
            break;

        case "folder":
            imageFilename = "folder_logo.png";
            break;

        case "project":
            imageFilename = "project_logo.png";
            break;

        case "appengine_app":
            imageFilename = "app_engine_logo.png";
            break;

        case "kubernetes_cluster":
            imageFilename = "container_engine_logo.png";
            break;

        case "cloudsqlinstance":
            imageFilename = "cloud_sql_logo.png";
            break;

        case "bucket":
            imageFilename = "cloud_storage_logo.png";
            break;

        default:
            imageFilename = "gcp-logo.png";
            break;
    }

    return URL_BASE + imageFilename;
}