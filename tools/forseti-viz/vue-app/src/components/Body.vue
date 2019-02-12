<template>
  <v-container fluid>
    <v-layout text-xs-center wrap class="margin-top-30">
      <v-flex xs12 mb-5>
        <v-layout justify-center>
          <v-flex xs3 mb-5>
            <div class="control-panel">
              <v-btn color="info" v-on:click="resetZoom">Reset Zoom</v-btn>

              <!--https://vuetifyjs.com/en/components/autocompletes -->
              <v-autocomplete
                v-model="nodeName"
                :hint="!isEditing ? 'Click the icon to edit' : 'Click the icon to save'"
                :items="resourceArray"
                :item-text="'resource_name'"
                :item-value="'resource_name'"
                :readonly="!isEditing"
                :label="`Resources`"
                persistent-hint
              >
                <v-slide-x-reverse-transition slot="append-outer" mode="out-in">
                  <v-icon
                    :color="isEditing ? 'success' : 'info'"
                    :key="`icon-${isEditing}`"
                    @click="isEditing = !isEditing"
                    v-text="isEditing ? 'mdi-check-outline' : 'mdi-circle-edit-outline'"
                  ></v-icon>
                </v-slide-x-reverse-transition>
              </v-autocomplete>

              <v-btn color="info" id="btn-search" v-on:click="search">Search</v-btn>

              <v-checkbox :label="`Expanded`" v-model="expand" v-on:change="toggleExpand"></v-checkbox>

              <v-checkbox
                :label="`Expand/Collapse All`"
                v-model="expandAll"
                v-on:change="toggleExpandAll"
              ></v-checkbox>

              <v-checkbox
                :label="`Show Violations`"
                v-model="showViolations"
                v-on:change="toggleViolations"
                disabled
              ></v-checkbox>

              <v-radio-group v-model="orientation" v-on:change="toggleOrientation">
                <v-radio
                  v-for="n in ['Vertical', 'Horizontal']"
                  :key="n"
                  :label="`${n}`"
                  :value="n"
                ></v-radio>
              </v-radio-group>

              <v-text-field label="Explain (user/$USER, group/$GROUP, serviceAccount/$SA)" v-model="iamSearchTerm"></v-text-field>
              <v-btn color="info" v-on:click="searchIam">Search IAM</v-btn>
            </div>
          </v-flex>

          <v-flex xs9 mb-5>
            <section id="d3-area"></section>
          </v-flex>
        </v-layout>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import $ from 'jquery';
import * as d3 from 'd3';

import D3Helpers from '../services/D3Helpers';
import GoogleCloudImageService from '../services/GoogleCloudImageService';
import DataService from '../services/DataService';
import Orientation from '../models/Orientation';

export default {
    /**
     * Vue: mounted() - onload function
     */
    mounted() {
        window.$ = $; // remove this line

        // Use the parsed tree data to dynamically create height & width
        this.width = this.defaultWidth - this.margin.left - this.margin.right;
        this.height = this.defaultHeight - this.margin.top - this.margin.bottom;

        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        this.svg = d3
            .select('#d3-area')
            .append('svg')
            .attr('width', this.width) // + margin.left + margin.right)
            .attr('height', this.height) // + margin.top + margin.bottom);
            .style('pointer-events', 'all');

        this.init(this.orientation);
    },

    /**
     * Vue: methods
     */
    methods: {
        /**
         * @function init
         * @description Initializes the Vue Component and the Tree Visualization
         * @param orientation - ['Vertical', 'Horizontal']
         */
        init: function(orientation) {
            let csv_data;
            let treeData, margin, tree, table, svg, g;
            let filename = 'resources.csv' + '?nocache=' + Date.now();

            if (orientation === 'Vertical') {
                DataService.getForsetiResources().then(resourcesData => {
                    // get inventory index id
                    if (resourcesData.length > 0) {
                        let inventoryIndexId =
                            resourcesData[0].inventory_index_id;

                        DataService.getViolations(inventoryIndexId).then(
                            violationsData => {
                                console.log('violations', violationsData);

                                // { resource_id: { violation } }
                                for (
                                    let i = 0;
                                    i < violationsData.length;
                                    i++
                                ) {
                                    this.violationsMap[
                                        violationsData[i].resource_id
                                    ] = violationsData[i];
                                }

                                console.log(
                                    'violationsMap',
                                    this.violationsMap
                                );

                                this.resourceArray = resourcesData
                                    .map(function(a) {
                                        a.parent_id =
                                            a.resource_type == 'organization'
                                                ? ''
                                                : a.parent_id;
                                        a.image = GoogleCloudImageService.getImageUrl(
                                            a.resource_type
                                        );
                                        a.resource_name =
                                            a.resource_data_displayname !== ''
                                                ? a.resource_data_displayname
                                                : a.resource_data_name;
                                        return a;
                                    })
                                    .sort(function(a, b) {
                                        // sort alphabetically, ignoring case
                                        if (
                                            a.resource_name.toLowerCase() <
                                            b.resource_name.toLowerCase()
                                        )
                                            return -1;
                                        if (
                                            a.resource_name.toLowerCase() <
                                            b.resource_name.toLowerCase()
                                        )
                                            return 1;
                                        return 0;
                                    });

                                console.log(
                                    'resourceArray:',
                                    this.resourceArray
                                );

                                this.initTree(orientation, this.resourceArray);
                            }
                        );
                    }
                });
            } else {
                d3.text(filename).then(results => {
                    let FILE_LOAD_END_TIME = new Date().toLocaleTimeString();
                    let csv_data = results;

                    let resourceArray = d3.csvParseRows(csv_data, (d, i) => {
                        return {
                            id: d[0],
                            resource_type: d[1],
                            category: d[2],
                            resource_id: d[3],
                            parent_id: d[1] == 'organization' ? '' : d[4],
                            resource_name: d[5] != '' ? d[5] : d[6],
                            image: GoogleCloudImageService.getImageUrl(d[1]),
                        };
                    });

                    this.initTree(orientation, resourceArray);
                });
            }
        },

        /**
         * @function initTree
         * @description Initializes the tree visualization
         * @param orientation - ['Vertical', 'Horizontal']
         * @param data - json array of objects
         * {
         *      id, resource_type, category, resource_id, parent_id, resource_data_displayname,
         *      resource_data_name, qq, image, resource_name
         * }
         */
        initTree: function(orientation, data) {
            let margin = this.margin;

            this.tree = d3.tree().size([this.width - 100, this.height]);
            this.treeData = d3
                .stratify()
                .id(function(d) {
                    return d.id;
                })
                .parentId(function(d) {
                    return d.parent_id;
                })(data);

            // assign the name to each node
            this.treeData.each(function(d) {
                // if (d.data.resource_name === 'Core Logic') {
                //     d.name = 'Test';
                //     return;
                // }
                d.name = d.data.resource_name;
            });

            // treeData is the root of the tree,
            // and the tree has all the data we need in it now.
            // let's draw that thing...

            // set up zoomListener function
            this.zoomListener = d3
                .zoom()
                .scaleExtent([1 / 2, 3])
                .on('zoom', () => {
                    this.g.attr(
                        'transform',
                        'translate(' +
                            (orientation === 'Vertical'
                                ? d3.event.transform.x + margin.left
                                : d3.event.transform.x + margin.top) +
                            ', ' +
                            (orientation === 'Vertical'
                                ? d3.event.transform.y + margin.top
                                : d3.event.transform.y + margin.left) +
                            ')scale(' +
                            d3.event.transform.k +
                            ')'
                    );
                });

            // set initial zoom
            if (orientation === 'Vertical') {
                this.svg
                    .call(
                        this.zoomListener,
                        d3.zoomIdentity.translate(
                            this.width / 2,
                            this.height / 2
                        )
                    )
                    .on('dblclick', null);

                // g "container", initially translated by the margin left and top
                this.g = this.svg
                    .append('g')
                    .attr(
                        'transform',
                        'translate(' + margin.left + ',' + margin.top + ')'
                    );
            } else {
                this.svg
                    .call(
                        this.zoomListener,
                        d3.zoomIdentity.translate(
                            this.width / 2,
                            this.height / 2
                        )
                    )
                    .on('dblclick', null);

                this.g = this.svg
                    .append('g')
                    .attr(
                        'transform',
                        'translate(' + margin.top + ',' + margin.left + ')'
                    );
            }

            // DEBUG: add rectangle representing the "g" dimension
            this.g
                .append('rect')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('fill', '#fff')
                .attr('fill-opacity', '0.3');

            // Collapse after the second level
            this.treeData.children.forEach(this.collapse);
            this.update(this.tree, this.treeData, this.treeData);
        },

        /**
         * @function collapse
         * @description Collapse the node and all of it's children
         */
        collapse: function(node) {
            if (node.children) {
                node._children = node.children;
                node._children.forEach(this.collapse);
                node.children = null;
            }
        },

        expandNodes: function(node) {
            if (node._children) {
                node.children = node._children;
                node.children.forEach(this.expandNodes);
                node._children = null;
            }
        },

        /**
         * @function toggle
         * @description Toggle children on node click (expand, collapse)
         */
        toggle: function(node, tree, treeData) {
            console.log('toggle', node);

            if (node.children) {
                node._children = node.children;
                node.children = null;
            } else {
                node.children = node._children;
                node._children = null;
            }

            this.update(tree, this.treeData, node);
        },

        /**
         * @function update
         * @description Handles the majority of D3 Visualization Interactivity
         */
        update: function(tree, treeData, source) {
            let circleRadius = this.circleRadius;
            let orientation = this.orientation;
            let duration = this.duration;

            // tooltip
            let tooltipDiv = d3
                .select('body')
                .append('div')
                .attr('class', 'tooltip')
                .style('opacity', 0);

            tree(treeData);

            console.log('update, source:', source);

            treeData.each(function(d) {
                d.y = d.depth * 180; // compute depth
            });

            console.log('treeData', treeData);
            console.log('descendants', treeData.descendants());

            let depthArr = [];
            let maxDepth = 10;
            let NUM_NODES_ACROSS_EXCEEDED = 8;
            for (let j = 0; j < maxDepth; j++) {
                depthArr.push(0);
            }

            let node = this.g
                .selectAll('.node')
                .data(treeData.descendants(), function(d) {
                    // console.log('descendant', d);
                    depthArr[d.depth]++;

                    return d.id || (d.id = ++this.nodeIdCounter);
                });

            // size adjustment based on depth, max-nodes-across-width
            let adjustSize = false;
            let adjustedWidth = 0;
            let adjustedHeight = 100;
            for (let i = 0; i < maxDepth; i++) {
                if (depthArr[i] === 0) break;

                adjustedHeight += 100;

                if (depthArr[i] > NUM_NODES_ACROSS_EXCEEDED) {
                    let newWidth = depthArr[i] * 100;
                    if (newWidth > adjustedWidth) {
                        adjustedWidth = newWidth;
                    }
                    adjustSize = true;
                }
            }
            if (adjustSize) {
                if (adjustedWidth > this.width) adjustedWidth = this.width;

                console.log(adjustedWidth, adjustedHeight);
                tree.size([adjustedWidth, adjustedHeight]);
                tree(treeData);
            }
            console.log('depthArr', depthArr);

            let nodeEnter = node
                .enter()
                .append('g')
                .attr('class', 'node')
                .attr('transform', function(d) {
                    return 'translate(' + source.x + ',' + source.y + ')';

                    return orientation === 'Vertical'
                        ? 'translate(' + source.x + ',' + source.y + ')'
                        : 'translate(' + source.y + ',' + source.x + ')';
                })
                .on('click', d => {
                    this.toggle(d, tree, treeData);
                })
                .on('mouseover', d => {
                    console.log('Update Violations sidebar', d);

                    // showTooltip(d);
                    tooltipDiv
                        .transition()
                        .duration(duration)
                        .style('opacity', 0.9);

                    // if d.data.resource_id matches a violations id
                    console.log(d.data.resource_id, this.violationsMap);
                    let tooltipContent = '';
                    if (this.violationsMap[d.data.resource_id]) {
                        // ${violationsMap[d.data.resource_id].violation_data}
                        tooltipContent = `
                            <div>
                                <h4>${
                                    this.violationsMap[d.data.resource_id]
                                        .violation_type
                                }</h4>
                                ${
                                    this.violationsMap[d.data.resource_id]
                                        .rule_name
                                }<br>
                            </div>`;

                        this.$root.$emit(
                            'send',
                            d,
                            this.violationsMap[d.data.resource_id]
                        );
                    } else {
                        // default tooltipContent
                        tooltipContent = `
                            <div>${d.data.category}
                                <br />
                                ${d.data.resource_name}
                                <br />
                                ${d.data.resource_type}
                            </div>`;

                        this.$root.$emit('send', d);
                    }

                    tooltipDiv
                        .html(tooltipContent)
                        .style('left', d3.event.pageX + 25 + 'px')
                        .style('top', d3.event.pageY - 28 + 'px');
                })
                .on('mouseout', function(d) {
                    tooltipDiv
                        .transition()
                        .duration(duration)
                        .style('opacity', 0);
                });

            nodeEnter
                .append('circle')
                .attr('r', circleRadius)
                .style('fill', function(d) {
                    return d._children ? 'lightsteelblue' : 'none';
                })
                .style('fill-opacity', function(d) {
                    return d._children ? 1 : 0;
                })
                .style('stroke-opacity', d => {
                    // if (!this.showViolations) return 0;

                    return this.violationsMap[d.data.resource_id] !== undefined
                        ? 1
                        : 0;
                })
                .style('stroke', d => {
                    // if (!this.showViolations) return 'black';
                    console.log(
                        'Has Violation:',
                        this.violationsMap[d.data.resource_id] !== undefined
                    );
                    // set to red
                    return this.violationsMap[d.data.resource_id] !== undefined
                        ? '#DB4437'
                        : 'black';
                });

            // adds the image to the node
            nodeEnter
                .append('image')
                .attr('xlink:href', function(d) {
                    return d.data.image;
                })
                .attr('x', function(d) {
                    return -16;
                })
                .attr('y', function(d) {
                    return -16;
                })
                .attr('height', 35)
                .attr('width', function(d) {
                    // console.log("image", d);
                    // if (d.depth === 2) return 35;
                    return 35;
                });

            // adds the text to the node
            nodeEnter
                .append('text')
                .attr('x', function(d) {
                    return d.children ? -25 : 25;
                })
                .attr('dy', '.35em')
                .style('text-anchor', function(d) {
                    return d.children ? 'end' : 'start';
                })

                .attr('transform', function(d) {
                    if (d.data.resource_type === 'organization') {
                        // there is only one of these
                        return 'translate(100, -100) rotate(-45)';
                    }
                    return orientation === 'Vertical'
                        ? 'translate(0,0) rotate(-45)'
                        : 'translate(0,0) rotate(0)';
                })
                .text(function(d) {
                    return d.name;
                });

            let nodeUpdate = nodeEnter.merge(node);

            nodeUpdate
                .transition()
                .duration(duration)
                .attr('transform', function(d) {
                    return orientation === 'Vertical'
                        ? 'translate(' + d.x + ',' + d.y + ')'
                        : 'translate(' + d.y + ',' + d.x + ')';
                });

            nodeUpdate
                .select('circle')
                .attr('r', circleRadius)
                .style('fill', function(d) {
                    return d._children ? 'lightsteelblue' : '#fff';
                })
                .style('fill-opacity', function(d) {
                    return d._children ? 1 : 0;
                })
                .style('stroke-opacity', d => {
                    return this.violationsMap[d.data.resource_id] !== undefined
                        ? 1
                        : 0;
                })
                .style('stroke', d => {
                    console.log(
                        'Has Violation:',
                        this.violationsMap[d.data.resource_id] !== undefined
                    );
                    // set to red
                    return this.violationsMap[d.data.resource_id] !== undefined
                        ? '#DB4437'
                        : 'black';
                });

            nodeUpdate.select('text').style('fill-opacity', 1);

            let nodeExit = node
                .exit()
                .transition()
                .duration(duration)
                .attr('transform', function(d) {
                    return orientation === 'Vertical'
                        ? 'translate(' + source.x + ',' + source.y + ')'
                        : 'translate(' + source.y + ',' + source.x + ')';
                })
                .remove();

            nodeExit.select('circle').attr('r', 1e-6);
            nodeExit.select('text').style('fill-opacity', 1e-6);

            let link = this.g
                .selectAll('.link')
                .data(treeData.links(), function(d) {
                    return d.target.id;
                });
            let linkEnter = link
                .enter()
                .insert('path', 'g')
                .attr('class', 'link')

                .attr(
                    'd',
                    d3
                        .linkHorizontal()
                        .x(function(d) {
                            return orientation === 'Vertical'
                                ? source.x
                                : source.y;
                        })
                        .y(function(d) {
                            return orientation === 'Vertical' ? d.y : d.x;
                        })
                );

            let linkUpdate = linkEnter.merge(link);
            linkUpdate
                .transition()
                .duration(duration)
                .attr(
                    'd',
                    d3
                        .linkHorizontal()
                        .x(function(d) {
                            return orientation === 'Vertical' ? d.x : d.y;
                        })
                        .y(function(d) {
                            return orientation === 'Vertical' ? d.y : d.x;
                        })
                );

            link.exit()
                .transition()
                .duration(duration)
                .attr(
                    'd',
                    d3
                        .linkHorizontal()
                        .x(function(d) {
                            return orientation === 'Vertical'
                                ? source.x
                                : source.y;
                        })
                        .y(function(d) {
                            return orientation === 'Vertical'
                                ? source.y
                                : source.x;
                        })
                )
                .remove();

            node.each(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        },

        /**
         * @function resetZoom
         * @description Resets the SVG zoom to the default.
         */
        resetZoom: function() {
            this.svg
                .transition()
                .duration(this.duration)
                .call(this.zoomListener.transform, d3.zoomIdentity);
        },

        /**
         * @function pulsate
         * @description Pulses a given node
         */
        pulsate: function(filterFn) {
            this.g
                .selectAll('.node')
                .filter(filterFn)
                .selectAll('circle')

                .transition()
                .duration(this.duration)
                .attr('r', 30)
                .style('fill', function(d) {
                    return 'lightgray';
                })
                .style('fill-opacity', function(d) {
                    return 1;
                })
                .transition()
                .duration(this.duration)
                .attr('r', 22)
                .style('fill', function(d) {
                    return d._children ? 'lightsteelblue' : 'none';
                })
                .style('fill-opacity', function(d) {
                    return d._children ? 1 : 0;
                });
        },

        searchIam: function() {
            console.log(this.iamSearchTerm);
            if (this.iamSearchTerm === '') {
                alert('Must not be empty');
                return;
            }

            DataService.getIam(this.iamSearchTerm).then(resources => {
                console.log(resources);

                // make nodes jump up or highlighted or something notable
                let matchingDataElements = [];

                // get all matching data elements
                this.treeData.each(function(d) {
                    for(let i = 0; i < resources.length; i++) {
                        let match = resources[i].resources[0].replace('organization', 'organizations').replace('folder', 'folders');
                        console.log(match, d.data.resource_data_name);
                        if (match === d.data.resource_data_name) {
                            matchingDataElements.push(d);
                        }
                    }
                });

                console.log(matchingDataElements);

                var ct = 0;

                for (var i in matchingDataElements) {
                    ct++;
                    var delay = 1200 * ct;

                    let el = matchingDataElements[i];
                    let ref = d3.selectAll(el);

                    let x = el.x;
                    let y = el.y;
                    let t = d3.zoomTransform(this.svg.node());

                    // pulsate nodes
                    this.pulsate(function(d, i) {
                        for(let i = 0; i < resources.length; i++) {
                            let match = resources[i].resources[0];
                            
                            if (match === d.data.resource_data_name) {
                                return true;
                            }
                        }

                        return false;
                    });

                    setTimeout(() => {
                        // update data
                        this.pulsate(
                            (function(el) {
                                return function(d, i) {
                                    if (d.id === el.id) {
                                        return true;
                                    }

                                    return false;
                                };
                            })(el)
                        );

                        this.g
                            .transition()
                            .duration(this.duration)
                            .attr('transform', d => {
                                if (this.orientation === 'Vertical') {
                                    return (
                                        'translate(' +
                                        (-x + this.width / 4) +
                                        ',' +
                                        (-y + this.height / 4) +
                                        ')scale(' +
                                        t.k +
                                        ')'
                                    );
                                } else {
                                    return (
                                        'translate(' +
                                        (-y + this.height / 4) +
                                        ',' +
                                        (-x + this.width / 4) +
                                        ')scale(' +
                                        t.k +
                                        ')'
                                    );
                                }
                            })
                            .on('end', () => {
                                let transX =
                                    this.orientation === 'Vertical'
                                        ? -x + this.width / 4
                                        : -y + this.height / 4 - 100;
                                let transY =
                                    this.orientation === 'Vertical'
                                        ? -y + this.height / 4 - 100
                                        : -x + this.width / 4;

                                this.svg.call(
                                    this.zoomListener.transform,
                                    d3.zoomIdentity
                                        .translate(transX, transY)
                                        .scale(t.k)
                                );
                            });
                    }, delay);
                }
            });
        },

        searchIamOld: function() {
            console.log(this.iamSearchTerm);

            // make nodes jump up or highlighted or something notable
            let matchingDataElements = [];

            // get all matching data elements
            this.treeData.each(function(d) {
                if (d.name === 'gwc-core' || d.name === 'gwongcloud.com') {
                    matchingDataElements.push(d);
                }
            });
            console.log(matchingDataElements);

            var ct = 0;

            for (var i in matchingDataElements) {
                ct++;
                var delay = 1200 * ct;

                let el = matchingDataElements[i];
                let ref = d3.selectAll(el);

                let x = el.x;
                let y = el.y;
                let t = d3.zoomTransform(this.svg.node());

                // pulsate nodes
                this.pulsate(function(d, i) {
                    console.log(d, i, el);

                    for (var i in matchingDataElements) {
                        let el = matchingDataElements[i];

                        if (d.id === el.id) {
                            return true;
                        }
                    }

                    return false;
                });

                setTimeout(() => {
                    // update data
                    this.pulsate(
                        (function(el) {
                            return function(d, i) {
                                console.log(d, el);

                                if (d.id === el.id) {
                                    return true;
                                }

                                return false;
                            };
                        })(el)
                    );

                    this.g
                        .transition()
                        .duration(this.duration)
                        .attr('transform', d => {
                            if (this.orientation === 'Vertical') {
                                return (
                                    'translate(' +
                                    (-x + this.width / 4) +
                                    ',' +
                                    (-y + this.height / 4) +
                                    ')scale(' +
                                    t.k +
                                    ')'
                                );
                            } else {
                                return (
                                    'translate(' +
                                    (-y + this.height / 4) +
                                    ',' +
                                    (-x + this.width / 4) +
                                    ')scale(' +
                                    t.k +
                                    ')'
                                );
                            }
                        })
                        .on('end', () => {
                            let transX =
                                this.orientation === 'Vertical'
                                    ? -x + this.width / 4
                                    : -y + this.height / 4 - 100;
                            let transY =
                                this.orientation === 'Vertical'
                                    ? -y + this.height / 4 - 100
                                    : -x + this.width / 4;

                            this.svg.call(
                                this.zoomListener.transform,
                                d3.zoomIdentity
                                    .translate(transX, transY)
                                    .scale(t.k)
                            );
                        });
                }, delay);
            }
        },

        /**
         * @function resetZoom
         * @description Searches for an exact text match of the node name and pans to that node
         */
        search: function() {
            let searchText = this.nodeName;

            // get the data element
            let el = null;
            this.treeData.each(function(d) {
                if (d.name === searchText) {
                    el = d;
                }
            });

            // add PULSE effect
            let ref = d3.selectAll(el);

            ref.attr('height', 400)
                .attr('r', 44)
                .style('fill', function(d) {
                    return d._children ? 'green' : '#241490';
                })
                .style('fill-opacity', function(d) {
                    return d._children ? 1 : 0;
                })
                .style('stroke', 'white')
                .style('stroke-opacity', 0)
                .enter()
                .append('circle')
                .filter(function(d, i) {
                    return i === 1;
                });
            // put all your operations on t

            // d3 magic to find the node and zoom to it
            // scale = zoomListener.scale();
            let x = el.x;
            let y = el.y;
            // x = x * scale + width / 2;
            // y = y * scale + height / 2;
            // d3.select('g').transition()
            //     .duration(duration)
            //     .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
            // zoomListener.scale(scale);
            // zoomListener.translate([x, y]);

            /* Moving the transform zoom layer on the screen which is tied to the svg */
            let t = d3.zoomTransform(this.svg.node());
            console.log('node');

            console.log(x + ',' + y);
            console.log(
                'translate(' +
                    (-x + this.width / 4) +
                    ',' +
                    (-y + this.height / 4) +
                    ')scale(' +
                    t.k +
                    ')'
            );

            /*
             * Notes:
             * x - the x-coord of the node searched
             * y - the y-coord of the node searched
             * w - the width
             * h - the height
             * m - the margin
             */

            // move to the node and zoom to it
            this.g
                .transition()
                .duration(this.duration)
                .attr('transform', d => {
                    if (this.orientation === 'Vertical') {
                        return (
                            'translate(' +
                            (-x + this.width / 4) +
                            ',' +
                            (-y + this.height / 4) +
                            ')scale(' +
                            t.k +
                            ')'
                        );
                    } else {
                        return (
                            'translate(' +
                            (-y + this.height / 4) +
                            ',' +
                            (-x + this.width / 4) +
                            ')scale(' +
                            t.k +
                            ')'
                        );
                    }
                })
                .on('end', () => {
                    // move drag position accordingly
                    // -100: account for margin on the height end
                    let transX =
                        this.orientation === 'Vertical'
                            ? -x + this.width / 4
                            : -y + this.height / 4 - 100;
                    let transY =
                        this.orientation === 'Vertical'
                            ? -y + this.height / 4 - 100
                            : -x + this.width / 4;

                    this.svg.call(
                        this.zoomListener.transform,
                        d3.zoomIdentity
                            // .translate(-350,-225)
                            //.translate(-750,-225)
                            .translate(transX, transY)
                            .scale(t.k)
                    );
                });
        },

        /**
         * @function toggleExpand
         * @description Expand/Collapse the [currently expanded] tree hierarchy.
         */
        toggleExpand: function() {
            document
                .getElementsByClassName('node')[0]
                .dispatchEvent(new Event('click'));
        },

        /**
         * @function toggleExpandAll
         * @description Expand/Collapse the entire tree hierarchy.
         */
        toggleExpandAll: function() {
            let nodes = this.svg.selectAll('.node');
            console.log('node()', nodes.node());
            console.log('nodes', nodes);

            let firstNode;

            if (!this.expandAll) {
                // collapse all
                this.collapse(this.treeData);
            } else {
                if (this.treeData.children === null) {
                    this.treeData.children = this.treeData._children;
                    this.treeData._children = null;
                }
                this.treeData.children.forEach(this.expandNodes);
            }

            this.update(this.tree, this.treeData, this.treeData);
        },

        /**
         * @function toggleOrientation
         * @description Change direction from horizontal to vertical and vice-versa
         */
        toggleOrientation: function() {
            let filename = 'resources.csv' + '?nocache=' + Date.now();

            // think we can use this next line instead the next 3 lines?
            // this.svg.remove();
            d3.select('#d3-area')
                .select('svg')
                .remove();

            // reset
            this.svg = d3
                .select('#d3-area')
                .append('svg')
                .attr('width', this.width)
                .attr('height', this.height)
                .style('pointer-events', 'all');

            // think we can remove this
            setTimeout(() => {
                this.init(this.orientation);
            }, 200);
        },

        /**
         * Show/Hide violations.
         */
        toggleViolations: function() {
            if (this.showViolations) {
                let nodes = this.svg.selectAll('.node');

                let circleRadius = this.circleRadius;
                let allCircles = nodes.selectAll('circle');
                console.log(allCircles.nodes());

                nodes
                    .selectAll('circle')
                    .transition(this.duration)
                    .attr('r', circleRadius * 2)
                    .attr('cx', 1)
                    .attr('cy', 2)

                    .style('fill', function(d) {
                        return d._children ? 'lightsteelblue' : 'none';
                    })
                    .style('fill-opacity', function(d) {
                        return d._children ? 1 : 0;
                    })
                    .style('stroke-opacity', function(d) {
                        return violationsMap[d.data.resource_id] !== undefined
                            ? 1
                            : 0;
                    })
                    .style('stroke', function(d) {
                        console.log(
                            'Has Violation:',
                            this.violationsMap[d.data.resource_id] !== undefined
                        );
                        // set to red
                        return violationsMap[d.data.resource_id] !== undefined
                            ? '#DB4437'
                            : 'black';
                    });

                console.log('nodes', nodes);
            } else {
                let nodes = this.svg.selectAll('.node');

                let circleRadius = this.circleRadius;
                // nodes.selectAll('circle').remove();
                nodes
                    .selectAll('circle')
                    .transition(this.duration)
                    .attr('r', circleRadius)
                    .attr('cx', 1)
                    .attr('cy', 2)

                    .attr('r', circleRadius)
                    .style('fill', function(d) {
                        return d._children ? 'lightsteelblue' : 'none';
                    })
                    .style('fill-opacity', function(d) {
                        return d._children ? 1 : 0;
                    })
                    .style('stroke-opacity', function(d) {
                        return this.violationsMap[d.data.resource_id] !==
                            undefined
                            ? 1
                            : 0;
                    })
                    .style('stroke', function(d) {
                        console.log(
                            'Has Violation:',
                            this.violationsMap[d.data.resource_id] !== undefined
                        );
                        // set to red
                        return this.violationsMap[d.data.resource_id] !==
                            undefined
                            ? '#DB4437'
                            : 'black';
                    });
            }
        },
    },

    /**
     * Vue: data
     */
    data: () => ({
        // filter variables
        nodeName: 'gwc-core',
        expand: true,
        expandAll: false,
        showViolations: true,
        orientation: 'Vertical',
        iamSearchTerm: '',

        // svg node elements
        svg: {},
        g: {},
        tree: {},
        zoomListener: {},

        // autocomp
        isEditing: true,
        model: null,
        resourceArray: [{ text: 'hi', value: 1, resource_name: 'test' }],
        resources: [
            'gwc-core',
            'gwongcloud.com',
            'Machine Learning',
            'Common Services',
            'sandbox',
        ],

        // svg data
        treeData: {},
        violationsMap: {},
        nodeIdCounter: 0, // the node id count and duration for animations

        // svg node configurable lengths/distances
        duration: 750, //ms
        circleRadius: 22, //px

        margin: {
            top: 100, //px
            right: 0,
            bottom: 0,
            left: 0,
        },
        defaultWidth: 1200,
        defaultHeight: 800,

        // computed
        width: 0, //px
        height: 0, //px
    }),
};
</script>

<style>
.margin-top-30 {
    margin-top: 0px;
}

.control-panel {
    /* background: #eef; */
    padding: 8px;
    /* border-bottom: 2px solid #bbd; */
}

/* d3 CSS */
#d3-area {
    margin-top: 8px;
    margin-left: auto;
    margin-right: auto;
    text-align: center;
}

svg {
    border: 2px silver solid;
    margin-left: auto;
    margin-right: auto;
}

.node circle {
    fill: #fff;
    stroke: steelblue;
    stroke-width: 3px;
}

.node text {
    font: 12px sans-serif;
}

.node--internal text {
    text-shadow: 0 1px 0 #fff, 0 -1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff;
}

.link {
    fill: none;
    stroke: #ccc;
    stroke-width: 2px;
}

div.tooltip {
    position: absolute;
    text-align: center;
    width: 240px;
    height: 80px;
    padding: 12px;
    font: 12px sans-serif;
    background: lightsteelblue;
    border: 0px;
    opacity: 0.5;
    border-radius: 8px;
    pointer-events: none;
}
</style>
