define(['./jquery', 'vein', './utils', './promise', 'require', './translations'], function($, vein, utils, Promise, require, translations) {
    "use strict";

    /**
     * @typedef PowerGridOptions
     * @type {object}
     * @property {number} virtualScrollingExcess - The number of extra rows to render on each side (top/bottom) of the viewport. A higher value results in less flickering during scrolling, but also higher memory usage and longer rendering times.
     * @property {number} frozenRowsTop - Number of rows at the top of the grid that should not scroll (i.e. header)
     * @property {number} frozenRowsBottom - Number of rows at the bottom of the grid that should not scroll (i.e. footer)
     * @property {number} frozenColumnsLeft - Number of columns on the left side of the grid that should not scroll
     * @property {number} frozenColumnsRight - Number of columns on the right side of the grid that should not scroll
     * @property {boolean} fullWidth - If true, the last column will stretch to fill the remaining space
     * @property {number} rowHeight - Default height of each row in pixels. Can be overridden in extensions on a per row basis.
     * @property {object} extensions - Object listing which extensions to load and their options
     */

    /**
     * @typedef CellByRowIdAndColumnKey
     * @property {string} row id
     * @property {string} column key
     */

    /**
     * Indicates a range of rows. Indices are 0-based.
     * @typedef Range
     * @property {number} start - The index of the first row in the range
     * @property {number} end - The index of the first row that's no longer in the range
     */

    var defaultOptions = {
        virtualScrollingExcess: 10, // defines the number of extra rows to render on each side (top/bottom) of the viewport. This reduces flickering when scrolling.
        frozenRowsTop: 0,
        frozenRowsBottom: 0,
        frozenColumnsLeft: 0,
        frozenColumnsRight: 0,
        fullWidth: true,
        rowHeight: 31
    };

    var columnDefaults = {
        width: 100
    };

    var sequence = 0;

    var debug = true;

    function determineScrollBarSize() {
        // Creates a dummy div just to measure the scrollbar sizes, then deletes it when it's no longer necessary.
        var dummy = $("<div style='overflow: scroll; width: 100px; height: 100px; visibility: hidden; opacity: 0'></div>");
        var filler = $("<div style='width:100%; height: 100%;'></div>");
        dummy.append(filler);
        $('body').append(dummy);

        var size = {
            height: dummy.height() - filler.height(),
            width: dummy.width() - filler.width()
        };

        dummy.remove();

        return size;
    }

    var scrollBarSize;

    $(function() {
        scrollBarSize = determineScrollBarSize();

        //adjust the margin to compensate for the scrollbar
        if (vein) {
            vein.inject('.pg-rowgroup', {'width': "calc(100% - " + scrollBarSize.width + "px)"});
            vein.inject('.pg-rowgroup.pg-footer', {'bottom': scrollBarSize.width + "px"});
        }
    });

    function elementWithClasses(tagname, classes) {
        var el = document.createElement(tagname);
        if(classes) {
            el.className=classes;
        }
        return el;
    }

    function nonFalse(e) {
        return e !== false;
    }

    /**
     * Creates a new PowerGrid.
     * @module PowerGrid
     * @param {HTMLElement} target - the DOM element that should contain the new grid
     * @param {PowerGridOptions} options - the options to use in the grid
     * @constructor
     */
    function PowerGrid(target, options) {
        var grid = this;
        this.options = options;
        this.target = target;

        for(var x in defaultOptions) {
            if(this.options[x] === undefined) {
                this.options[x] = defaultOptions[x];
            }
        }

        this.dataSource = options.dataSource;

        if(target === false) return;

        this.promise = new Promise(function(resolve, reject) {
            grid.beginInit(resolve);
        });

        this.id = target.attr('id');

        $(target).on('remove', function() {
            grid.destroy();
        });
    }

    PowerGrid.prototype =
        /**
         * @lends PowerGrid.prototype
         */
    {
        /**
         * Queues the callback to invoke when the grid is ready
         * @param {function} callback - the callback to invoke when the grid is ready
         */
        then: function(callback) {
            return this.promise.then(callback);
        },

        /**
         * Begins the initialisation of the grid and invokes the given callback when ready
         * @private
         * @param callback
         */
        beginInit: function(callback) {
            var grid = this;

            // set column defaults
            this.options.columns.forEach(function(column, index) {
                if(column.key === undefined) {
                    column.key = index;
                }

                for(var i in columnDefaults) {
                    if(!(i in column)) {
                        column[i] = columnDefaults[i];
                    }
                }
            });

            if(this.options.extensions) {
                this.loadExtensions(function(pluginList, plugins) {
                    pluginList = grid.sortByLoadOrder(pluginList, plugins);

                    pluginList.forEach(function(key) {
                        console.info("Initing extension " + key);
                        var p = plugins[key];
                        try {
                            if (typeof p === 'function') {
                                p(grid, grid.options.extensions[key]);
                            } else if (typeof p.init === 'function') {
                                p.init(grid, grid.options.extensions[key]);
                            }
                        } catch(e) {
                            console.error("Error initializing extension " + key);
                            console.error(e);
                            throw e;
                        }
                    });

                    grid.init();
                    callback();
                });
            } else {
                grid.init();
                callback();
            }
        },

        /**
         * Recursively load extensions and their dependencies
         * @private
         * @param callback
         * @param keys
         * @param plugins
         * @param pluginList
         */
        loadExtensions: function(callback, keys, plugins, pluginList) {
            var grid = this;
            if(arguments.length < 4) {
                keys = Object.keys(this.options.extensions),
                plugins = {};
                pluginList = [];
            }

            var newkeys = [];
            for (var i = 0, n = keys.length; i < n; i++) {
                var key = keys[i];
                var plugin = require('./extensions/' + key);
                plugins[key] = plugin;
                pluginList.push(key);

                var reqs = plugin.requires;
                if (reqs) {
                    for(var req in reqs) {
                        if(!grid.options.extensions[req]) {
                            newkeys.push(req);
                        }

                        if(!grid.options.extensions[req] || grid.options.extensions[req] === true) {
                            grid.options.extensions[req] = reqs[req];
                        } else {
                            $.extend(true, grid.options.extensions[req], reqs[req]);
                        }
                    }
                }
            };

            if(newkeys.length) {
                grid.loadExtensions(callback, newkeys, plugins, pluginList);
            } else {
                callback(pluginList, plugins);
            }
        },

        sortByLoadOrder: function(pluginList, plugins) {
            var sorted = [], added = {};

            function add(key) {
                if(plugins[key] !== undefined && added[key] === undefined) {
                    if(plugins[key].loadFirst) {
                        plugins[key].loadFirst.forEach(add);
                    }
                    sorted.push(key);
                    added[key] = true;
                }
            }

            pluginList.forEach(add);

            return sorted;
        },

        initLoadingIndicator: function () {
            $(this.target).addClass('pg-loading');
        },

        elementId: function () {
            var id = this.target.attr('id');
            if(!id) {
                id = "powergrid-"+ (sequence++);
                this.target.attr('id', id);
            }
            return id;
        },

        /**
         * Initializes the grid elements and event listeners
         * @private
         */
        init: function init() {
            var grid = this;
            var baseSelector = this.baseSelector = "#" + this.elementId(),
                container = this.container = $("<div class='powergrid'>"),
                columnheadercontainer = this.columnheadercontainer = $("<div class='pg-columnheaders'>"),
                headercontainer = this.headercontainer = this.options.frozenRowsTop && $("<div class='pg-rowgroup pg-header'>") || undefined,
                scrollingcontainer = this.scrollingcontainer = $("<div class='pg-rowgroup pg-scrolling'>"),
                footercontainer = this.footercontainer = this.options.frozenRowsBottom && $("<div class='pg-rowgroup pg-footer'>") || undefined,
                scroller = this.scroller = $("<div class='pg-scroller'>"),
                scrollFiller = this.scrollFiller = $("<div class='pg-scroller-filler'>"),

                scrollContainers = this.scrollContainers = ($().add(scrollingcontainer).add(headercontainer).add(footercontainer));

            if(this.options.fullWidth) {
                container.addClass("pg-full-width");
            }

            if(this.options.autoResize) {
                container.addClass("pg-autoresize");
            }

            var hiddenColumns = this.loadSetting("hidden");
            if(hiddenColumns) {
                this._hideColumns(hiddenColumns);
            }

            this.fixedLeft = this.fixedRight = this.middleScrollers = $();

            this.columnheadergroup = this.createRowGroup(columnheadercontainer);
            this.headergroup = headercontainer && this.createRowGroup(headercontainer);
            this.scrollinggroup = this.createRowGroup(scrollingcontainer, false);
            this.footergroup = footercontainer && this.createRowGroup(footercontainer);

            this.renderColumnHeaderContents(this.columnheadergroup);

            container.append(scroller.append(scrollFiller)).append(scrollingcontainer).append(columnheadercontainer).append(headercontainer).append(footercontainer);

            this.queueAdjustColumnPositions();

            $(this.target).append(container);

            scroller.on('scroll', function(evt) {
                grid.syncScroll(this, evt);
            });

            if(this.dataSource.isReady()) {
                if(!grid.isInited) {
                    grid.isInited = true;
                    grid.trigger('inited', grid);
                }

                grid.resetDataSubscriptions();

                grid.trigger('dataloaded');
                utils.inAnimationFrame(function() {
                    grid.renderData();
                    grid.trigger('viewchanged');
                    $(grid.target).removeClass('pg-loading');
                });
            } else {
                this.initLoadingIndicator();
            }

            this.dataSource.on("dataloaded", function(data) {
                if(!grid.isInited) {
                    grid.isInited = true;
                    grid.trigger('inited', grid);
                }

                grid.resetDataSubscriptions();

                grid.trigger('dataloaded', data);
                utils.inAnimationFrame(function() {
                    grid.renderData();

                    grid.queueAfterRender(function() {
                        grid.trigger('viewchanged');
                        $(grid.target).removeClass('pg-loading');
                    });
                });
            });

            this.dataSource.on("rowsremoved", function (data) {
                grid._removeRows(data.start, data.end);

                grid.queueUpdateViewport();
                grid.queueAdjustHeights();
                grid.queueAfterRender(function () {
                    grid.trigger('rowsremoved', data);
                    grid.trigger('viewchanged');
                });
            });

            this.dataSource.on("rowsadded", function (data) {
                grid._addRows(data.start, data.end);

                grid.queueUpdateViewport();
                grid.queueAdjustHeights();

                grid.queueAfterRender(function () {
                    grid.trigger('rowsadded', data);
                    grid.trigger('viewchanged');
                });
            });

            this.dataSource.on("datachanged", function(data) {
                utils.inAnimationFrame(function() {
                    if(data.values) {
                        grid.updateCellValues(data.values);
                        grid.trigger('change');
                    }
                    if(data.rows) {
                        grid.updateRows(data.rows);
                        grid.trigger('change');
                    }
                    grid.trigger('datachanged', data);
                    grid.trigger('viewchanged');
                });
            });

            this.initScrollEvents();
        },

        /**
         * Invokes the given callback immediately if the grid is ready, or queues the callback to be invoked
         * as soon as the grid is ready.
         * @deprecated see {@link PowerGrid#then}
         * @param {function} callback - The callback to invoke.
         */
        ready: function(callback) {
            if(this.isInited) callback.apply(this, [this]);
            else this.on('inited', callback.bind(this, this));
        },

        /**
         * Remove the grid from the DOM and clean up.
         */
        destroy: function() {
            this.target.empty();
        },

        /**
         * Set up scroll event handler
         * @private
         */
        initScrollEvents: function initScrollEvents() {
            var self = this;
            this.target.on("wheel", function(evt) {
                var dX = evt.originalEvent.deltaX, dY = evt.originalEvent.deltaY, dM = evt.originalEvent.deltaMode, ddX, ddY;
                switch(dM) {
                    case 0: ddX=ddY=1; break;
                    case 1: ddX=ddY=self.rowHeight(0); break;
                    case 2: ddX=self.pageHeight(); ddY=self.pageWidth(); break;
                }

                if(self.scrollBy(dX * ddX, dY * ddY)) {
                    evt.preventDefault();
                }
            });

            this.initTouchScrollEvents();
        },

        /**
         * Set up touch event handler. This mimics inertial touch scrolling on touch devices.
         * @private
         */
        initTouchScrollEvents: function() {
            // sets up touch scrolling
            var self = this,
                tracking = false, // keep tracking of whether we're currently tracking touch or not
                lastX, lastY,
                timeUnit = 100, // 100ms
                inertialCutOff = 0.001, // minimum speed for inertial scrolling before cutoff
                inertia = 0.998, // inertia for inertial scrolling (higher means longer scrolling, 1 = infinite (frictionless) scrolling, 0 = no inertial scrolling)
                // scroll speed is multiplied by this factor for each millisecond that passes

                eventQueue = []; // keep track of last 100ms of events to determine drag speed

            function pruneEventQueue() {
                // remove all eventQueue entries older than <timeUnit> milliseconds
                var t = eventQueue[0].t;
                for(var x=1,l=eventQueue.length;x<l;x++) {
                    if( (t - eventQueue[x].t) > timeUnit ) break;
                }
                eventQueue = eventQueue.slice(0, x);
            }

            function startInertialScroll(speedX, speedY) {
                var previousTime = new Date().getTime();

                var scrollPosition = self.getScrollPosition();

                function draw() {
                    if(tracking) return; // if tracking a new touch thing, stop inertial scrolling

                    var t = new Date().getTime();
                    var frameDuration = t - previousTime;
                    previousTime = t;

                    var r = Math.pow(inertia, frameDuration);
                    speedX = speedX * r; // adjust speed according to drag
                    speedY = speedY * r;

                    if(Math.abs(speedX) >= inertialCutOff && Math.abs(speedY) >= inertialCutOff) {
                        // not doing relative scrolling because that looses a lot of precision
                        scrollPosition.left += speedX * frameDuration;
                        scrollPosition.top += speedY * frameDuration;
                        self.scrollTo(Math.round(scrollPosition.left), Math.round(scrollPosition.top));

                        // request next frame.
                        requestAnimationFrame(draw);
                    }
                };

                utils.inAnimationFrame(draw);
            }

            this.target.on("touchstart", function(startevent) {
                // user touches screen, so we may have to start scrolling
                tracking = true;
                lastX = startevent.originalEvent.touches[0].pageX, lastY = startevent.originalEvent.touches[0].pageY;
            }).on("touchmove", function(dragevent) {
                if(tracking) { // probably a pointless test since we shouldn't be getting a touchmove event unless we got a touchstart first anyway, but still
                    var newX = dragevent.originalEvent.touches[0].pageX, newY = dragevent.originalEvent.touches[0].pageY;

                    var dX = lastX - newX, dY = lastY - newY;

                    var e = {
                        x: dX,
                        y: dY,
                        t: new Date().getTime()
                    };

                    eventQueue.unshift(e);
                    pruneEventQueue();

                    lastX = newX;
                    lastY = newY;

                    self.scrollBy(dX, dY);

                    dragevent.preventDefault();
                }
            }).on("touchend", function(endevent) {
                tracking = false;

                if(!eventQueue.length) return;

                var timeSinceLastEvent = (new Date().getTime()) - eventQueue[0].t;
                if(timeSinceLastEvent < timeUnit) {
                    var delta = eventQueue.reduce(function(a,b) {
                        a.dX += b.x;
                        a.dY += b.y;
                        return a;
                    }, { dX: 0, dY: 0 });

                    var timeBetween = eventQueue[0].t - eventQueue[eventQueue.length-1].t;

                    startInertialScroll(delta.dX / timeBetween, delta.dY / timeBetween);
                }

                eventQueue = [];
            });
        },

        /**
         * Creates a row group in the given container. There are three row groups in the grid: top, scrolling (center), and bottom.
         * @private
         * @param container
         * @returns {{left: boolean|*|jQuery|HTMLElement, scrolling: *|jQuery|HTMLElement, right: boolean|*|jQuery|HTMLElement, all: *|jQuery|HTMLElement}}
         */
        createRowGroup: function createRowGroup(container) {
            var fixedPartLeft = this.options.frozenColumnsLeft > 0 && $("<div class='pg-container pg-fixed pg-left'>");
            var fixedPartRight = this.options.frozenColumnsRight > 0 && $("<div class='pg-container pg-fixed pg-right'>");
            var scrollingPart = $("<div class='pg-container pg-scrolling'>");

            this.fixedLeft = this.fixedLeft.add(fixedPartLeft);
            this.fixedRight = this.fixedRight.add(fixedPartRight);
            this.middleScrollers = this.middleScrollers.add(scrollingPart);

            var all = $();
            if(fixedPartLeft) all = all.add(fixedPartLeft);
            if(scrollingPart) all = all.add(scrollingPart);
            if(fixedPartRight) all = all.add(fixedPartRight);

            container.append(scrollingPart).append(fixedPartLeft).append(fixedPartRight);

            return {
                left: fixedPartLeft,
                scrolling: scrollingPart,
                right: fixedPartRight,
                all: all
            };
        },

        /**
         * Because data requests are asynchronous, it's possible a data request returns with stale data. This method
         * invalidates all ongoing data requests so no stale data is handled by methods that have been properly queued
         * in the dataSubscriptions SubscriptionQueue.
         */
        resetDataSubscriptions: function() {
            if(this.dataSubscriptions) {
                this.dataSubscriptions.cancel();
            }
            this.dataSubscriptions = new utils.SubscriptionQueue();
        },

        /**
         * Resets the grid contents.
         * @private
         */
        renderData: function() {
            var self = this;

            var recordCount = Promise.resolve(this.dataSource.recordCount()).then(this.dataSubscriptions.queue(function(recordCount) {
                self.headergroup && self.headergroup.all.empty();
                self.footergroup && self.footergroup.all.empty();

                self.recordCount = recordCount;

                self.resetDataSubscriptions(); // cancel any requests that still assume the old recordCount

                /**
                 * The working set contains all rows that are currently in the grid (though not necessarily in view) and have
                 * been loaded through 'getData'. If the dataset changes, this needs to be kept up to date and the indexes in
                 * the working set should always match the index in the grid for any given row.
                 */
                self.workingSet = new Array(recordCount);

                self.allRowsDisposed();

                self.setViewport({
                    begin: 0,
                    end: 0
                });

                self.headergroup && self.renderRowGroupContents(0, self.options.frozenRowsTop, self.headergroup);
                self.footergroup && self.renderRowGroupContents(recordCount - self.options.frozenRowsBottom, recordCount, self.footergroup);

                self.queueUpdateViewport();
                self.queueAdjustHeights();
                self.queueAfterRender(function() {
                    self.trigger("datarendered");
                });
            }));
        },

        /**
         * Returns a row by index from the working set, or undefined if the row wasn't loaded yet.
         * @param {number} index
         * @returns {object}
         */
        getRow: function(index) {
            return this.workingSet[index];
        },

        /**
         * Returns the index of the given row. Only works if it's in the working set (i.e. the row has been loaded in the grid).
         * @param {object} row
         * @returns {number}
         */
        indexOfRow: function(row) {
            return this.workingSet.indexOf(row);
        },

        /**
         * Returns the current number of records known to be in the datasource, or throws an Exception if the amount isn't known.
         * @returns {number}
         */
        getRecordCount: function() {
            if(this.recordCount === undefined) {
                throw "Record count currently unknown."
            }
            return this.recordCount;
        },

        /**
         * Calls the dataSource's getData, updates the working set and returns a Promise of the results.
         * @param start
         * @param end
         * @returns {Promise<object[]>|object[]}
         */
        getData: function(start, end) {
            var self = this;
            var data = this.dataSource.getData(start, end);

            function processData(result) {
                for (var x = 0, l = result.length; x < l; x++) {
                    self.workingSet[(start || 0) + x] = result[x];
                }
                return result;
            }

            if (Array.isArray(data)) {
                return processData(data);
            } else {
                return data.then(processData);
            }
        },

        /**
         * Calls the dataSource's getData, updates the working set and immediately returns the records. This
         * only works if the dataSource is synchronous (i.e. getData returns an array, not a Promise), and throws
         * an exception otherwise.
         * @param start
         * @param end
         */
        getDataSync: function(start, end) {
            var result = this.dataSource.getData(start, end);
            if (Array.isArray(result)) {
                for (var x = 0, l = result.length; x < l; x++) {
                    this.workingSet[(start || 0) + x] = result[x];
                }
                return result;
            } else {
                throw new Error("This method requires a synchronous datasource.");
            }
        },

        /**
         * Renders the column headers to the given rowgroup
         * @private
         * @param rowgroup
         */
        renderColumnHeaderContents: function(rowgroup) {
            var rowFixedPartLeft = rowgroup.left && $("<div class='pg-row pg-fixed'>"),
                rowScrollingPart = rowgroup.scrolling && $("<div class='pg-row pg-scrolling'>"),
                rowFixedPartRight = rowgroup.right && $("<div class='pg-row pg-fixed'>"),
                rowParts = $();

            if(rowgroup.left) rowgroup.left.append(rowFixedPartLeft);
            if(rowgroup.scrolling) rowgroup.scrolling.append(rowScrollingPart);
            if(rowgroup.right) rowgroup.right.append(rowFixedPartRight);

            if(rowFixedPartLeft) rowParts = rowParts.add(rowFixedPartLeft);
            if(rowScrollingPart) rowParts = rowParts.add(rowScrollingPart);
            if(rowFixedPartRight) rowParts = rowParts.add(rowFixedPartRight);

            var columns = this.getVisibleColumns();
            for(var y = 0; y < columns.length; y++) {
                var cell, column = columns[y];
                cell = this.renderHeaderCell(column, y);

                cell.addClass("pg-column" + this.normalizeCssClass(column.key));
                cell.attr("data-column-key", column.key);

                if(y < this.options.frozenColumnsLeft) {
                    rowFixedPartLeft.append(cell);
                } else if(y > columns.length - this.options.frozenColumnsRight - 1) {
                    rowFixedPartRight.append(cell);
                } else {
                    rowScrollingPart.append(cell);
                }
            }
        },

        /**
         * Templates for row groups
         * @private
         */
        rowGroupTemplates: {
            fixed: elementWithClasses("div", "pg-row pg-fixed"),
            scrolling: elementWithClasses("div", "pg-row pg-scrolling")
        },

        /**
         * Render contents (indicated by a start and end index) for a given rowgroup, and insert them before or after
         * the given index.
         * @private
         * @param {number} start
         * @param {number} end
         * @param {object} rowgroup
         * @param {boolean} prepend
         * @param {index} atIndex
         */
        renderRowGroupContents: function(start, end, rowgroup, prepend, atIndex) {
            var self = this;

            if(atIndex == -1 && !prepend) {
                // we're inserting a row after -1, so basically prepend before anything else
                atIndex = undefined;
                prepend = true;
            }

            var method = atIndex === undefined ? (prepend === true ? 'prepend' : 'append') : (prepend === true ? 'before' : 'after');

            var targetLeft, targetMiddle, targetRight;

            if(atIndex === undefined) {
                targetLeft = rowgroup.left;
                targetMiddle = rowgroup.scrolling;
                targetRight = rowgroup.right;
            } else {
                targetLeft = rowgroup.left && rowgroup.left.children(".pg-row:eq(" + atIndex + ")");
                targetMiddle = rowgroup.scrolling && rowgroup.scrolling.children(".pg-row:eq(" + atIndex + ")");
                targetRight = rowgroup.right && rowgroup.right.children(".pg-row:eq(" + atIndex + ")");
            }

            var fragmentLeft = targetLeft && document.createDocumentFragment(),
                fragmentMiddle = targetMiddle && document.createDocumentFragment(),
                fragmentRight = targetRight && document.createDocumentFragment();

            var dataSubset = this.getData(start<0?0:start, end);
            var rows = new Array(end-start);

            for(var x = start; x < end; x++) {
                var rowFixedPartLeft = targetLeft && this.rowGroupTemplates.fixed.cloneNode();
                var rowScrollingPart = targetMiddle && this.rowGroupTemplates.scrolling.cloneNode();
                var rowFixedPartRight = targetRight && this.rowGroupTemplates.fixed.cloneNode();
                var rowParts = [rowFixedPartLeft, rowScrollingPart, rowFixedPartRight].filter(nonFalse);

                rows[x] = {
                    rowFixedPartLeft: rowFixedPartLeft,
                    rowScrollingPart: rowScrollingPart,
                    rowFixedPartRight: rowFixedPartRight
                };

                rowParts.forEach(function(e) {
                    e.setAttribute("data-row-idx", x);
                    e.style.height = self.rowHeight(x) + "px";
                });

                if(fragmentLeft)   fragmentLeft.appendChild(rowFixedPartLeft);
                if(fragmentMiddle) fragmentMiddle.appendChild(rowScrollingPart);
                if(fragmentRight)  fragmentRight.appendChild(rowFixedPartRight);
            }

            function populateRows(dataSubset) {
                for(var x = start; x < end; x++) {
                    var record = dataSubset[x-start],
                        row = rows[x],
                        rowFixedPartLeft = row.rowFixedPartLeft,
                        rowScrollingPart = row.rowScrollingPart,
                        rowFixedPartRight = row.rowFixedPartRight;

                    var rowParts = [rowFixedPartLeft, rowScrollingPart, rowFixedPartRight].filter(nonFalse);

                    self.renderRowToParts(record, x, rowFixedPartLeft, rowScrollingPart, rowFixedPartRight);
                    self.afterRenderRow(record, x, rowParts);

                    rowParts.forEach(function(e) {
                        e.setAttribute("data-row-id", record.id);
                    });
                }
            }

            if (Array.isArray(dataSubset)) {
                populateRows(dataSubset);
            } else {
                // assume Promise<object[]>
                dataSubset.then(this.dataSubscriptions.queue(populateRows)).catch(function (error) {
                    console.error(error);
                });
            }

            if(targetLeft) targetLeft[method](fragmentLeft);
            if(targetMiddle) targetMiddle[method](fragmentMiddle);
            if(targetRight) targetRight[method](fragmentRight);
        },

        /**
         * Do not invoke directly. Renders the cells for the given record to the rows parts; each row
         * can have three parts: the left fixed part, a middle scrolling part and a right fixed part.
         * @param {object} record - The record to render
         * @param {number} rowIdx - The index of the row
         * @param {HTMLElement} rowFixedPartLeft
         * @param {HTMLElement} rowScrollingPart
         * @param {HTMLElement} rowFixedPartRight
         */
        renderRowToParts: function(record, rowIdx, rowFixedPartLeft, rowScrollingPart, rowFixedPartRight) {
            var columns = this.getVisibleColumns();
            for(var y = 0; y < columns.length; y++) {
                var cell, column = columns[y];
                cell = this.renderCell(record, column, rowIdx, y);
                this.afterCellRendered(record, column, cell);

                cell.className += " pg-column" + this.normalizeCssClass(column.key);
                cell.setAttribute("data-column-key", column.key);

                if(y < this.options.frozenColumnsLeft) {
                    rowFixedPartLeft.appendChild(cell);
                } else if(y > columns.length - this.options.frozenColumnsRight - 1) {
                    rowFixedPartRight.appendChild(cell);
                } else {
                    rowScrollingPart.appendChild(cell);
                }
            }
        },

        /**
         * Invoked after a row is rendered to its parts.
         * @param {object} record - The record that was rendered
         * @param {number} rowIndex - The index of the row
         * @param {HTMLElement[]} rowParts - array containing the row parts (left, middle, right)
         */
        afterRenderRow: function(record, rowIndex, rowParts) {
        },

        /**
         * Remove the rows from start to end index.
         * @param start
         * @param end
         * @private
         */
        _removeRows: function(start, end) {
            if(end > this.recordCount || end < start) {
                throw "Index mismatch";
            }
            this.recordCount -= end - start;

            if (this.workingSet) {
                this.workingSet.splice(start, end - start);
            }

            var self = this;

            if (end <= this.viewport.begin) {
                // deleted rows come before the viewport, so adjust the viewport indexes and index attributes of rendered rows
                this.viewport.begin -= end - start;
                this.viewport.end -= end - start;
                this._incrementRowIndexes(start, start - end);

                if (debug) this.verify();
            } else if (end > this.viewport.begin && start < this.viewport.end) {
                // deleted block has overlap with current viewport, so remove currently rendered rows

                // find pg-row elements to remove. as gt and lt work within the result, first do 'lt' as 'gt' affect indeces
                // first build a selector
                var selector = ".pg-row";
                if (end < this.viewport.end) {
                    selector += ":lt(" + (end - this.viewport.begin) + ")";
                }
                if (start > this.viewport.begin) {
                    selector += ":gt(" + (start - this.viewport.begin - 1) + ")";
                }
                // then query all row containers with that selector
                this.scrollingcontainer.children(".pg-container").each(function (i, part) {
                    // and destroy the found row elements
                    var children = $(part).children(selector)
                    if(children.length != Math.min(end, self.viewport.end) - Math.max(start, self.viewport.begin)) {
                        debugger;
                    }
                    self.destroyRows(children);
                });

                if(end < this.viewport.end) {
                    // adjust the index attributes of the remaining rendered rows after the deleted block.
                    this._incrementRowIndexes(start, start - end);
                }

                if(start < this.viewport.begin) {
                    // deleted block covers start of viewport
                    this.viewport.begin = start;
                }

                // the effective viewport will have shrunk, so adjust it
                if(end >= this.viewport.end) {
                    this.viewport.end = Math.max(start, this.viewport.begin);
                    if (debug) this.verify();
                } else {
                    this.viewport.end -= end-start;
                    if (debug) this.verify();
                }
            } else {
                if (debug) this.verify();
            }

            this.queueUpdateViewport();
        },

        /**
         * The current range of rows that should be rendered.
         * @returns {*|{begin, end}}
         */
        viewRange: function() {
            var self = this,
                start = this.options.frozenRowsTop,
                end = this.getRecordCount() - this.options.frozenRowsBottom,
                sPos = this.getScrollPosition(),
                sArea = this.getScrollAreaSize(),
                range = this.rowsInView(sPos.top, sPos.top + sArea.height, start, end);

            var begin = Math.max(start, range.begin - this.options.virtualScrollingExcess);
            range.begin = begin - (begin%2); // maintain odd/even-ness of rows for styling purposes
            range.end = Math.min(end, range.end + this.options.virtualScrollingExcess);

            return range;
        },

        /**
         * Scroll the grid to the given row index
         * @param {number} rowIdx
         */
        scrollToCell: function(rowIdx) {
            var self = this,
                start = this.options.frozenRowsTop,
                end = this.getRecordCount() - this.options.frozenRowsBottom,
                sPos = this.getScrollPosition(),
                sArea = this.getScrollAreaSize(),
                range = this.rowsInView(sPos.top, sPos.top + sArea.height, start, end),
                newScrollTop = sPos.top,
                newScrollLeft = sPos.left;

            if( (!this.options.frozenRowsTop || rowIdx >= this.options.frozenRowsTop) &&
                (!this.options.frozenRowsBottom || rowIdx < this.getRecordCount() - this.options.frozenRowsBottom)) {

                // row is in scrolling part
                if(rowIdx <= range.begin || rowIdx >= range.end) {
                    // row is outside viewport. we gotta scroll.
                    newScrollTop = Math.max(0, this.rowHeight(start, rowIdx) - sArea.height / 2);
                }
            }

            this.scrollTo(newScrollLeft, newScrollTop);
        },

        /**
         * Update the column headers and widths, and optionally data
         * @param {boolean} renderData - true if the data should be rendered as well.
         */
        updateColumns: function (renderData) {
            if(renderData !== false) {
                this.renderData();
            }
            this.columnheadergroup.all.empty();
            this.renderColumnHeaderContents(this.columnheadergroup);
            this.queueAdjustColumnPositions(false);
        },

        /**
         * Hide the given columns
         * @param {string[]} keys - array of column keys to hide
         */
        hideColumns: function(keys) {
            this.saveSetting("hidden", keys);
            this._hideColumns(keys);
            this.updateColumns();
        },

        /**
         * Set the specific columns visibility
         * @param key
         * @param visibility
         */
        setColumnVisibility: function(key, visibility) {
            var column = this.getColumnForKey(key);
            column.hidden = !visibility;
            var keys = this.options.columns.filter(
                function(column) {
                    return column.hidden;
                }).map(function(column) {
                    return column.key;
                });
            this.saveSetting("hidden", keys);
            this.updateColumns();
        },

        /**
         * Check if the given column is hidden
         * @param {object} column - Column object
         * @returns {boolean}
         */
        isColumnHidden: function(column) {
            return column.hidden || false
        },

        _hideColumns: function(keys) {
            this.options.columns.forEach(function (column) {
                column.hidden = keys.indexOf(column.key) > -1;
            });
        },

        /**
         * Increment the row index attributes on the row HTML elements.
         * @param {number} start - the index of the first row that should be updated. Only this row and rows after this one will be updated
         * @param {number} offset - value to increment the indexes by
         * @private
         */
        _incrementRowIndexes: function(start, offset) {
            this.container.find("> .pg-rowgroup > .pg-container > .pg-row").each(function(idx, row) {
                var idx = parseInt(row.getAttribute('data-row-idx'));
                if(idx >= start) {
                    row.setAttribute('data-row-idx', idx + offset);
                }
            });
        },

        /**
         * Handler for the 'rowsadded' event.
         * @param {number} start - The index of the first row that was added.
         * @param {number} end - The index of the last row that was added.
         * @private
         */
        _addRows: function(start, end) {
            if(start > this.recordCount) {
                throw "Index mismatch";
            }

            this.recordCount += end - start;

            if (this.workingSet) {
                // insert the appropriate amount of new empty entries in the workingSet
                this.workingSet = this.workingSet.slice(0, start).concat(new Array(end - start)).concat(this.workingSet.slice(start));
            }


            if (end >= this.viewport.begin && start < this.viewport.end) {
                // the new rows are within the current viewport, so add the new rows to the grid
                // excess rows in the viewport will be truncated in updateViewport

                // adding rows can have an effect on the viewport, so predict what the new viewport should be like
                var viewRange = this.viewRange();

                // overlap of the viewport and new datablock. The new viewport (viewRange) after inserting may be
                // larger than the current viewport, so take the new viewport into account
                var renderEnd = Math.min(Math.max(viewRange.end, this.viewport.end), end);
                var renderStart = Math.max(this.viewport.begin, start);
                var renderCount = renderEnd - renderStart;

                // if we're appending
                // and the last row that's appended's index + 1 is not equal the adjusted index of the insertion point row
                // so renderEnd != renderStart + end - start
                // then it's not contiguous
                if (renderEnd != renderStart + end - start) {
                    // we're not rendering the last rows of the new data block, so we have to remove all rows starting from the insertion point
                    var startIndexForDeletion = renderStart - this.viewport.begin;
                    var self = this;
                    var selector = ".pg-row";
                    if(startIndexForDeletion > 0) {
                        selector += ":gt(" + (startIndexForDeletion - 1) + ")";
                    }
                    this.scrollinggroup.all.each(function (i, part) {
                        var rows = $(part).children(selector);
                        if(debug && rows.length != self.viewport.end - renderStart) {
                            // our selector is returning more rows than we're expecting
                            debugger;
                        }
                        self.destroyRows(rows);
                    });
                    // adjust the viewport
                    this.viewport.end = renderStart;
                }

                // update the data-row-idx attributes
                this._incrementRowIndexes(start, end - start);
                this.viewport.end += renderCount;

                if(renderEnd == this.viewport.end) { // if this block of data comes right at the end of the viewport
                    // append rows to the end
                    this.renderRowGroupContents(renderStart, renderEnd, this.scrollinggroup, false);
                } else {
                    // otherwise insert them before the correct index
                    this.renderRowGroupContents(renderStart, renderEnd, this.scrollinggroup, true, renderStart - this.viewport.begin);
                }

                if (debug) this.verify();
            } else if (end < this.viewport.begin) {
                // the new rows are inserted before the current viewport, so shift the indexes of the viewport and rendered rows
                this.viewport.end += end - start;
                this.viewport.begin += end - start;
                this._incrementRowIndexes(start, end - start);

                if (debug) this.verify();
            } else {
                if (debug) this.verify();
            }

            // schedule a viewport update
            this.queueUpdateViewport();
        },

        /**
         * Invoked when the viewport has changed.
         * @param {boolean} renderExcess - if true, immediately render excess rows. If false, this is scheduled for a later time.
         */
        updateViewportImmediate: function(renderExcess) {
            var start = this.options.frozenRowsTop,
                end = this.getRecordCount() - this.options.frozenRowsBottom,
                sPos = this.getScrollPosition(),
                sArea = this.getScrollAreaSize(),
                rowsInView = this.rowsInView(sPos.top, sPos.top + sArea.height, start, end),
                rowsInViewWithExcess = {
                    begin: Math.max(start, rowsInView.begin - this.options.virtualScrollingExcess),
                    end: Math.min(end, rowsInView.end + this.options.virtualScrollingExcess)
                },
                range;

            // updateViewport does a two-pass refresh of the viewport. In the first pass, it will render only the rows
            // that are necessary to fill the current viewport. The second pass (renderExcess == true) is called at the
            // next available timeslot, and adds the excess rows. This is to ensure that the time before the user sees
            // the updated viewport is as short as possible, and the user does not have to wait for rows to render
            // that he's not going to see anyway.
            if(!renderExcess) {
                // First pass, render as little as possible.
                if(utils.overlap(this.viewport, rowsInViewWithExcess)) {
                    // the target viewport is adjacent to the current one, so we'll take the union of the current
                    // viewport with what is going to be visible to the user. That means no rows are being removed
                    // from the DOM just yet, only rows are being added (either rows that are going to be visible,
                    // or excess rows that are required in the DOM to keep the viewport contiguous).
                    range = {
                        begin: Math.min(rowsInView.begin, this.viewport.begin),
                        end: Math.max(rowsInView.end, this.viewport.end)
                    }
                } else {
                    // there is no overlap of the current viewport with the target viewport, so just drop the current
                    // viewport alltogether.
                    range = rowsInView;
                }
            } else {
                range = rowsInViewWithExcess;
            }

            this.setViewport(range);

            if(!renderExcess) {
                (window.clearImmediate) && window.clearImmediate(this._updateViewportImmediate);
                this._updateViewportImmediate = (window.setImmediate || requestAnimationFrame)(this.updateViewportImmediate.bind(this, true));
            }
        },

        updateViewport: utils.debounce(function() {
            requestAnimationFrame(this.updateViewportImmediate.bind(this));
        }, 100),

        /**
         * Invoked when the viewport needs to change (e.g. when scrolling)
         * @param {Range} range
         */
        setViewport: function(range) {
            var self = this,
                start = this.options.frozenRowsTop,
                end = this.getRecordCount() - this.options.frozenRowsBottom,
                group = this.scrollinggroup,
                allParts = group.all;

            if(!this.viewport || range.begin != this.viewport.begin || range.end != this.viewport.end) {
                var leadingHeight = this.rowHeight(start, range.begin),
                    trailingHeight = this.rowHeight(range.end, end);

                if(utils.overlap(range, this.viewport)) {
                    if(range.begin < this.viewport.begin) {
                        // have to add rows to beginning
                        this.renderRowGroupContents(Math.max(start, range.begin), Math.min(range.end, this.viewport.begin), this.scrollinggroup, true);
                    } else if(range.begin > this.viewport.begin) {
                        // have to remove rows from beginning
                        allParts.each(function(i,part) {
                            self.destroyRows($(part).children('.pg-row:lt(' + (range.begin - self.viewport.begin) + ')'));
                        });
                    }

                    if(range.end < this.viewport.end && range.end > this.viewport.begin) {
                        // have to remove rows from end
                        allParts.each(function(i,part) {
                            self.destroyRows($(part).children('.pg-row:gt(' + (range.end - range.begin - 1) + ')'));
                        });
                    } else if(range.end > this.viewport.end) {
                        // have to add rows to end
                        this.renderRowGroupContents(Math.max(this.viewport.end, range.begin), Math.min(range.end, end), this.scrollinggroup, false);
                    }
                } else {
                    // no overlap, just clear the entire thing and rebuild
                    allParts.empty();
                    this.allRowsDisposed();

                    var scrollingStart = Math.max(start, range.begin);
                    var scrollingEnd =   Math.min(range.end, end);

                    if(scrollingEnd > scrollingStart) {
                        this.renderRowGroupContents(scrollingStart, scrollingEnd, this.scrollinggroup, false);
                    }
                }

                allParts.css('padding-top', leadingHeight + 'px');
                allParts.css('padding-bottom', trailingHeight + 'px');

                this.viewport = range;
            }

            if (debug) this.verify();
        },

        _updateStyle: function(temporary, selector, style) {
            if(temporary === true) {
                $(selector).css(style);
            } else {
                if(temporary === false) {
                    // means we explicitely invoke this after temporary changes, so reset the temporary changes first
                    var reset = {};
                    Object.keys(style).forEach(function(key) { reset[key] = ""; });
                    $(selector).css(reset);
                }
                vein.inject(selector, style);
            }
        },

        /**
         * Update column widths.
         * @param {boolean} temporary - pass true for performance when a series of changes are expected, but always finalize by passing false.
         */
        adjustWidths: function adjustWidths(temporary) {
            // Adjusts the widths of onscreen parts. Triggered during init, or when changing column specifications
            var columns = this.options.columns;
            for(var x = 0, l=columns.length; x < l; x++) {
                var column = columns[x];
                var w = this.columnWidth(x);

                var fullWidth = this.options.fullWidth && x < this.options.columns.length - this.options.frozenColumnsRight;
                for(var xx=x+1; fullWidth && xx < this.options.columns.length - this.options.frozenColumnsRight; xx++) {
                    if(!this.isColumnHidden(this.options.columns[xx])) {
                        fullWidth = false;
                    }
                }

                if(fullWidth) {
                    this._updateStyle(temporary, this.baseSelector + " .pg-column" + this.normalizeCssClass(column.key), {"width": "auto", "min-width": w + "px", "right": "0"});
                } else {
                    this._updateStyle(temporary, this.baseSelector + " .pg-column" + this.normalizeCssClass(column.key), {"width": w + "px", "right": "auto"});
                }
            }

            var leadingWidth = this.columnWidth(0, this.options.frozenColumnsLeft);
            var middleWidth = this.columnWidth(this.options.frozenColumnsLeft, this.options.columns.length - this.options.frozenColumnsRight);
            var trailingWidth = this.columnWidth(this.options.columns.length - this.options.frozenColumnsRight, this.options.columns.length);
            this.fixedLeft.css("width", leadingWidth + "px");
            this.fixedRight.css("width", trailingWidth + "px");
            this.columnheadergroup.right && this.columnheadergroup.right.css("width", (trailingWidth + scrollBarSize.width) + "px");
            var minWidth = 'calc(100% - ' + leadingWidth +'px - ' + trailingWidth + 'px)';
            this.middleScrollers.css({"left": leadingWidth + "px", "width": middleWidth + "px", "min-width":  minWidth});
            this.scrollFiller.css({"width": (leadingWidth + middleWidth + trailingWidth) + "px"});

            if(this.options.autoResize) {
                this.container.css({"width": (this.columnWidth(0, this.options.columns.length)) + "px" });
            }
        },

        /**
         * Adjusts the heights of onscreen parts. Invoked during init, or when changing row heights and such.
         */
        adjustHeights: function adjustHeights() {
            var columnHeaderHeight = this.headerContainerHeight();
            var headerHeight = this.rowHeight(0, this.options.frozenRowsTop);
            var footerHeight = this.rowHeight(this.getRecordCount() - this.options.frozenRowsBottom, this.getRecordCount());
            this.columnheadercontainer.css("height", (columnHeaderHeight) + "px");
            this.columnheadergroup.all.css("height", (this.headerHeight()) + "px");

            this.headercontainer && this.headercontainer.css("height", (headerHeight) + "px").css("top", (columnHeaderHeight) + "px");
            this.footercontainer && this.footercontainer.css("height", (footerHeight) + "px");

            this.scrollingcontainer.css("top", (columnHeaderHeight + headerHeight) + "px").css("bottom", (footerHeight + (this.options.autoResize ? 0 : scrollBarSize.height)) + "px");

            this.scroller.css("top", columnHeaderHeight + "px");
            this.scrollFiller.css({"height": this.rowHeight(0, this.getRecordCount()) + this.scroller.height() - this.scrollingcontainer.height() });

            if(this.options.autoResize) {
                this.container.css({"height": (this.rowHeight(0, this.getRecordCount()) + columnHeaderHeight) + "px"});
            }
        },

        /**
         * Returns the height of the header container. In a default implementation, this is the same as {@link PowerGrid#headerHeight}.
         * Extensions can however add other elements to the header container, and override this method.
         * @returns {number} The height in pixels
         */
        headerContainerHeight: function() {
            return this.headerHeight();
        },

        /**
         * Returns the height of the header contents
         * @returns {number} The height in pixels.
         */
        headerHeight: function headerHeight() {
            return Math.max.apply(undefined, this.target.find(".pg-columnheader span").map(function(i, e) {
                return $(e).outerHeight();
            }));
        },

        /**
         * Adjust the grid when the column order has changed.
         * @param {boolean} temporary - pass true for performance when a series of changes are expected, but always finalize by passing false.
         * @returns {number[]} the positions of each column in pixels within their parts.
         */
        adjustColumnPositions: function adjustColumnPositions(temporary) {
            // Repositions all columns horizontal positions
            var columns = this.options.columns;
            var pos = 0;
            var positions = new Array(this.options.length);
            for(var x=0, l = columns.length; x<l; x++) {
                var column = columns[x];
                if(x == this.options.frozenColumnsLeft || l-x == this.options.frozenColumnsRight) {
                    pos = 0;
                }
                positions[x] = pos;
                this._updateStyle(temporary, this.baseSelector + " .pg-column" + this.normalizeCssClass(column.key), {left: pos + "px"});
                column.offsetLeft = pos;

                pos += this.columnWidth(x);
            }

            this.adjustWidths(temporary);

            return positions;
        },

        /**
         * Queues a render update and returns an object on which render queue flags can be set.
         * @returns {object}
         */
        queueRenderUpdate: function() {
            var self = this;
            if(this.renderQueue == undefined) {
                this.renderQueue = {callbacks: []};
                utils.inAnimationFrame(function() {
                    self.processRenderQueue(self.renderQueue);

                    self.renderQueue.callbacks.forEach(function(f) {
                        f.apply(self);
                    });

                    self.renderQueue = undefined;
                }, true);
            }

            return this.renderQueue;
        },

        /**
         * Process the render queue
         * @private
         * @param queue
         */
        processRenderQueue: function(queue) {
            if(queue.syncScroll) {
                this.syncScroll(true);
            }

            if(queue.updateViewport) {
                this.updateViewport();
            }

            if(queue.adjustColumnPositions) {
                this.adjustColumnPositions(queue.columnPositionsTemporary);
            }

            if(queue.adjustHeights) {
                this.adjustHeights();
            }
        },

        /**
         * Queue an adjustment of column positions.
         * @param temporary - see {@link PowerGrid#adjustColumnPositions}
         */
        queueAdjustColumnPositions: function(temporary) {
            var q = this.queueRenderUpdate();
            if(!temporary) {
                q.columnPositionsTemporary = false;
            } else if(q.columnPositionsTemporary === undefined) {
                q.columnPositionsTemporary = temporary;
            }
            q.adjustColumnPositions = true;
        },

        /**
         * Queue a height adjustment
         */
        queueAdjustHeights: function() {
            this.queueRenderUpdate().adjustHeights = true;
        },

        /**
         * Queue a viewport adjustment
         */
        queueUpdateViewport: function() {
            this.queueRenderUpdate().updateViewport = true;
        },

        /**
         * Invoke the given callback after the next render queue is finished
         * @param f
         */
        queueAfterRender: function(f) {
            this.queueRenderUpdate().callbacks.push(f);
        },

        /**
         * Queue a sync scroll
         */
        queueSyncScroll: function() {
            this.queueRenderUpdate().syncScroll = true;
        },

        /**
         * Changes the given columns width
         * @param {object} column - The column whose width needs to be changed
         * @param {number} width - The width of the column in pixels
         * @param {boolean} temporary - True for performance, false if the changes need to persist. Use 'true' when changing multiple columns or rapidly changing widths.
         */
        setColumnWidth: function(column, width, temporary) {
            column.width = width;
            this.queueAdjustColumnPositions(temporary);
            this.queueAdjustHeights();
        },

        /**
         * Calculates the total width of the given range of columns, or a single column
         * @param {number} start - Index of the first column
         * @param {number|undefined} end - Index of the last column + 1, or undefined if only a single column should be measured
         * @param {function|undefined} transform - A transformation that should be applied to each column's width before adding it
         * @returns {number} The total column width in pixels
         */
        columnWidth: function columnWidth(start, end, transform) {
            var self = this;
            function columnWidth(x) {
                var col = self.options.columns[x];
                return self.isColumnHidden(col) ? 0 : (transform ? transform(col, col.width) : col.width);
            }

            // Calculate the width of a single column, or of a range of columns
            if(end == undefined) {
                return columnWidth(start);
            } else {
                var sum=0;
                while(start<end) {
                    sum += columnWidth(start++);
                }
                return sum;
            }
        },

        /**
         * Calculates the total height of the given range of rows, or of a single row.
         * @param {number} start - index of the first row to calculate the height for
         * @param {number} end - index of the last row to calculate the height for + 1, or undefined if only a single row should be measure
         * @returns {number} The total row height in pixels
         */
        rowHeight: function rowHeight(start, end) {
            // if end argument is passed, calculates the accumulative heights of rows start until end (exclusive)
            if(end == undefined) {
                return this.options.rowHeight;
            } else {
                return (end - start) * this.options.rowHeight;
            }
        },

        /**
         * Finds rows within the viewport defined by both coordinates in pixels
         * @param {number} top - Viewport top coordinate in pixels
         * @param {number} bottom - Viewport bottom coordinates in pixels
         * @param {number|undefined} start - If defined, returned row positions are relative to this
         * @param {number|undefined} end - If defined, stop counting at this index
         * @returns {*}
         */
        rowsInView: function(top, bottom, start, end) {
            var begin=-1, ct=0;
            for(var x=(start||0),l=end||this.getRecordCount();x<l;x++) {
                ct += this.rowHeight(x);
                if(ct>=top && begin===-1) {
                    begin = x;
                } else if(ct > bottom) {
                    break;
                }
            }
            if(begin > -1) {
                return { begin: begin - ((begin%2) - (this.options.frozenRowsTop%2)), end: x };
            } else {
                return { begin: 0, end: 0 };
            }
        },

        /**
         * Scroll by a specific offset
         * @param {number} dX - number of pixels the grid contents should shift left
         * @param {number} dY - number of pixels the grid contents should shift up
         * @returns {boolean} false if there was no change
         */
        scrollBy: function(dX, dY) {
            var self = this;

            if(
                (dX < 0 && self.scroller[0].scrollLeft == 0) ||
                (dX > 0 && self.scroller[0].scrollLeft == self.scroller[0].scrollWidth - self.scroller[0].offsetWidth + scrollBarSize.width) ||
                (dY < 0 && self.scroller[0].scrollTop == 0) ||
                (dY > 0 && self.scroller[0].scrollTop == self.scroller[0].scrollHeight - self.scroller[0].offsetHeight + scrollBarSize.height)) {
                    return false;
            }


            if(self.scrollBydY === undefined && self.scrollBydX === undefined) {
                self.scrollBydY = dY;
                self.scrollBydX = dX;
                (window.setImmediate || requestAnimationFrame)(function() {
                    self.scroller[0].scrollTop += self.scrollBydY;
                    self.scroller[0].scrollLeft += self.scrollBydX;
                    self.scrollBydY = undefined;
                    self.scrollBydX = undefined;
                    self.afterscroll();
                });
            } else {
                self.scrollBydY += dY;
                self.scrollBydX += dX;
            }

            return true;
        },

        /**
         * Scroll to a specific location
         * @param {number} x
         * @param {number} y
         */
        scrollTo: function(x, y) {
            this.scroller[0].scrollTop = Math.max(0, y);
            this.scroller[0].scrollLeft = Math.max(0, x);
            this.afterscroll();
        },

        /**
         * Get the current scroll position
         * @returns {{left: number, top: number}}
         */
        getScrollPosition: function() {
            return {
                left: this.scroller[0].scrollLeft,
                top: this.scroller[0].scrollTop
            };
        },

        /**
         * Get the size of the
         * @returns {{width: number, height: number}}
         */
        getScrollAreaSize: function() {
            return {
                width: this.container.children('.pg-rowgroup.pg-scrolling').children('.pg-container.pg-scrolling')[0].offsetWidth,
                height: this.container.children('.pg-rowgroup.pg-scrolling')[0].offsetHeight
            };
        },

        /**
         * @private
         * @param source
         * @param event
         * @param lazy
         */
        syncScroll: function syncScroll(source, event, lazy) {
            if(arguments.length == 1 && typeof(arguments[0]) == 'boolean') {
                lazy = arguments[0];
                source = undefined;
            }
            if(!source) source = this.scroller[0];
            this.container.children('.pg-scrolling').scrollTop(source.scrollTop);
            this.middleScrollers.css('transform', 'translate(-' + source.scrollLeft + 'px,0)');
            if(!lazy) {
                this.afterscroll();
            }
        },

        /**
         * Invoked after the grid was scrolled, to schedule a viewport update etc.
         * @private
         */
        afterscroll: function() {
            this.updateViewport();
            $(this).trigger('scroll');
        },

        /**
         * Generates the cell for a given column
         * @param column
         * @param columnIdx
         * @returns {jQuery}
         */
        renderHeaderCell: function renderHeaderCell(column, columnIdx) {
            return $("<div class='pg-columnheader'>").append($("<span>").text(column.title));
        },

        /**
         * Template for cells
         * @private
         */
        renderCellTemplate: (function() {
            var el = document.createElement("div");
            el.className = 'pg-cell';
            return el;
        })(),

        /**
         * Renders the cell for a given record and column
         * @param record
         * @param column
         * @param rowIdx
         * @param columnIdx
         * @returns {Node}
         */
        renderCell: function renderCell(record, column, rowIdx, columnIdx) {
            // Render the cell container
            var el = this.renderCellTemplate.cloneNode();
            var content = this.renderCellContent(record, column);
            if(content) {
                el.appendChild(content);
            }
            return el;
        },

        /**
         * Renders the contents for the cell of a given record and column
         * @param record
         * @param column
         * @returns {*}
         */
        renderCellContent: function(record, column) {
            return this.renderCellValue(record, column, this.getCellTextValue(utils.getValue(record, column.key), record, column));
        },

        /**
         * Updates the cell values
         * @param {CellByRowIdAndColumnKey[]} list - List of row ids and column keys that should be updated
         */
        updateCellValues: function(list) {
            for(var x=0,l=list.length;x<l;x++) {
                this.updateCellValue(list[x].id, list[x].key);
            }
        },

        /**
         * Update the given rows completely
         * @param {object[]} list - List of records to update
         */
        updateRows: function(list) {
            var columns = this.getVisibleColumns();
            for(var x=0,l=list.length;x<l;x++) {
                for(var y=0, cl=columns.length; y<cl; y++) {
                    this.updateCellValue(list[x].id, columns[y].key);
                }
            }
        },

        /**
         * Invoked after a cell is rendered
         * @param {object} record - Record for which the cell was rendered
         * @param {object} column - Column for which the cell was rendered
         * @param {Node} cell - The rendered cell
         */
        afterCellRendered: function(record, column, cell) {

        },

        /**
         * Update the given cell
         * @param {string} rowId - id of the row to update
         * @param {string} key - key of the column to update
         */
        updateCellValue: function(rowId, key) {
            var row = this.findRow(rowId);
            var cell = row.children(".pg-cell[data-column-key='" + key + "']");
            if(cell.length) {
                var record = this.dataSource.getRecordById(rowId),
                    column = this.getColumnForKey(key);
                cell.empty();
                this.cellContentDisposed(record, column);
                cell.append(this.renderCellContent(record, column));
                this.afterCellRendered(record, column, cell[0]);
            }
        },

        /**
         * Shorthand for dataSource#getRecordById(rowId)
         * @param rowId
         */
        getRecordById: function(rowId) {
            return this.dataSource.getRecordById(rowId);
        },

        /**
         * Finds the row element for the given row id
         * @param {string} rowId
         * @returns {jQuery}
         */
        findRow: function(rowId) {
            return this.container.find("> .pg-rowgroup > .pg-container > .pg-row[data-row-id='" + rowId + "']");
        },

        cellValueTemplate: (function() {
            var el = document.createElement("span");
            return el;
        })(),

        /**
         * Render the cell content for the given record, column and value
         * @param {object} record
         * @param {object} column
         * @param {*} value - The value to render.
         * @returns {Node}
         */
        renderCellValue: function renderCellValue(record, column, value) {
            // Render the cell content
            var el = this.cellValueTemplate.cloneNode();
            if(value != null) {
                el.textContent = value;
            }
            return el;
        },

        /**
         * Returns a text representation of the given value for the given record and column.
         * @param {*} value
         * @param {object} record
         * @param {object} column
         * @returns {*}
         */
        getCellTextValue: function (value, record, column) {
            return value;
        },

        /**
         * @returns {object[]} - List of visible columns
         */
        getVisibleColumns: function () {
            var self = this;
            return this.options.columns.filter(function(c) {
                return !self.isColumnHidden(c);
            });
        },

        /**
         * Returns the column object for the given column key
         * @param {string} key
         * @returns {object}
         */
        getColumnForKey: function(key) {
            return this.getColumnForIndex(this.getColumnIndexForKey(key));
        },

        /**
         * Returns the column at the given index
         * @param {number} index
         * @returns {object}
         */
        getColumnForIndex: function(index) {
            return this.options.columns[index];
        },

        /**
         * Returns the number of columns
         * @returns {number}
         */
        columnCount: function() {
            return this.options.columns.length;
        },

        /**
         * Returns the index for the column with the given key
         * @param {string} key
         * @returns {number}
         */
        getColumnIndexForKey: function(key) {
            // Returns the column for the given key
            for(var x=0,l=this.options.columns.length; x<l; x++) {
                if(this.options.columns[x].key == key) {
                    return x;
                }
            }
        },

        /**
         * Get the DOM node for the given cell
         * @param {string} rowId - Row id
         * @param {string} key - Column key
         * @returns {Node}
         */
        getCellFor: function(rowId, key) {
            return this.container.find(".pg-row[data-row-id='" + rowId + "'] > .pg-cell[data-column-key='" + key + "']");
        },

        /**
         * Trigger a jQuery event on the grid and its container element
         * @param eventName
         * @param data
         */
        trigger: function(eventName, data) {
            $(this).trigger(eventName, data);
            $(this.target).trigger(eventName, data);
        },

        /**
         * Register a event handler
         * @param eventName
         * @param handler
         * @returns {jQuery}
         */
        on: function(eventName, handler) {
            return $(this).on(eventName, handler);
        },

        /**
         * Register a one-time event handler
         * @param eventName
         * @param handler
         * @returns {jQuery}
         */
        one: function(eventName, handler) {
            return $(this).one(eventName, handler);
        },

        /**
         * Returns the row group for the given index
         * @private
         * @param rowIndex
         * @returns {*}
         */
        getRowGroupFor: function(rowIndex) {
            if(rowIndex < this.options.frozenRowsTop) {
                return this.headergroup;
            } else if(rowIndex > this.getRecordCount() - this.options.frozenRowsBottom) {
                return this.footergroup;
            } else {
                return this.scrollinggroup;
            }
        },

        /**
         * Returns all the parts for the given row index
         * @private
         * @param rowIndex
         */
        getRowPartsForIndex: function(rowIndex) {
            return this.getRowGroupFor(rowIndex).all.children(".pg-row[data-row-idx='" + rowIndex + "']");
        },

        /**
         * Stores a setting for this grid
         * @param {string} id
         * @param {*} value
         */
        saveSetting: function (id, value) {
            localStorage[this.options.settingsId + "_" + id] = JSON.stringify(value);
        },

        /**
         * Loads a setting for this grid
         * @param {string} id
         * @returns {any}
         */
        loadSetting: function(id) {
            var s = localStorage[this.options.settingsId + "_" + id];
            if (s) {
                return JSON.parse(s);
            }
        },

        /**
         * Returns the CSS class that is used to represent the given identifier (used to transform column keys etc).
         * @param c
         * @returns {*}
         * @private
         */
        normalizeCssClass: function(c) {
            if (c.replace) {
                return c.replace(/[^a-zA-Z0-9]/g, '_');
            }
            return c;
        },

        /**
         * Invoked when a cell's content is removed from the DOM
         * @param {object} record
         * @param {object} column
         */
        cellContentDisposed: function(record, column) {
            // hook for extensions to be notified when a cell's content is removed from the DOM.
        },

        /**
         * Invoked when the grids contents is removed from the DOM
         */
        allRowsDisposed: function() {
            // hook for extensions to be notified when the whole grid's contents are removed from the DOM.
        },

        /**
         * Remove the given rows from the DOM
         * @private
         * @param rows
         */
        destroyRows: function(rows) {
            rows.remove();
            if(typeof this.rowsDisposed === 'function') {
                this.rowsDisposed(this.getIdsFromRows(rows));
            }
        },

        /**
         * Extract the row id's from the given row DOM nodes
         * @private
         * @param {Node[]} rows
         */
        getIdsFromRows: function(rows) {
            return rows.map(function(i, r) {
                return $(r).attr('data-row-id');
            }).toArray();
        },

        /**
         * Updates a single row's height
         * @private
         * @param {number} rowIndex
         */
        updateRowHeight: function(rowIndex) {
            var parts = this.getRowPartsForIndex(rowIndex);
            parts.css({height: this.rowHeight(rowIndex) + "px"});
        },

        /**
         * @returns {number} the viewports width in pixels
         */
        viewportWidth: function() {
            return this.container.width() - scrollBarSize.width;
        },

        /**
         * Invoked when the grid container has resized.
         */
        resize: function() {
            // indicate that the grid container has resized. used in extensions.
        },

        /**
         * Checks grid DOM tree against internal data:
         * - data-row-idx against viewport.begin and viewport.end
         * - data-row-id against workingSet
         * - amount of rows against viewport size
         */
        verify: function () {
            var rowGroups = this.scrollinggroup.all;
            var hasError = false;
            for (var g = 0; g < rowGroups.length; g++) {
                var group = rowGroups[g];
                var rows = group.children;
                if (rows.length != this.viewport.end - this.viewport.begin) {
                    debugger;
                    hasError = true;
                    console.error("Rowgroup does not contain expected amount of rows", group, this.viewport);
                } else {
                    for (var r = 0; r < rows.length; r++) {
                        var row = rows[r];
                        var record = this.workingSet[this.viewport.begin + r];
                        if (parseInt(row.getAttribute("data-row-idx")) != this.viewport.begin + r) {
                            debugger;
                            hasError = true;
                            console.error("Row does not have matching index", row, record, this.viewport, r);
                        }
                        if (record !== undefined && row.hasAttribute("data-row-id") && row.getAttribute("data-row-id") != record.id) {
                            debugger;
                            hasError = true;
                            console.error("Row does not have matching identifier", row, record, this.viewport, r);
                        }
                    }
                }
            }
        },
        translate: function(key) {
            var langCode = this.options.languageCode;
            if (translations[langCode] === undefined) {
                langCode = 'en';
            }

            var translation = key.split('.').reduce(function(m, key) {
                return m[key];
            }, translations[langCode]);
            return translation;
        }
    };

    $.fn.extend({ PowerGrid: function(options) {
        var d = this.data("powergrid");

        if(options) {
            if(d) d.destroy();
            d = new PowerGrid(this, options);
            this.data("powergrid", d);
        }

        return d;
    }});

    return PowerGrid;
});
