define(['../override', '../jquery', '../utils',
    '../datasources/filteringdatasource',
    '../templates/filterPane',
    '../templates/filterBox'], function(override, $, utils, FilteringDataSource, filterPane, filterBox) {
    "use strict";

    return {
        init: function(grid, pluginOptions) {
            return override(grid, function($super) {
                var columnSettings = pluginOptions.defaultFilterSettings || {};
                var filters = pluginOptions.filters || {};
                
                return {
                    init: function() {
                        if(typeof this.dataSource.applyFilter !== 'function') {
                            this.dataSource = new FilteringDataSource(this.dataSource);
                        }
                        
                        $super.init();
                        
                        this.container.on("click mousedown", ".pg-filter-box", function(event) {
                            event.stopPropagation();
                        });

                        if (grid.dataSource.isReady()) {
                            grid.dataSource.applyFilter(columnSettings);
                        } else {
                            grid.dataSource.one('dataloaded', function() {
                                grid.dataSource.applyFilter(columnSettings);
                            });
                        }
                    },
                    
                    destroy: function() {
                        $super.destroy();
                    },

                    renderHeaderCell: function(column, columnIdx) {
                        var header = $super.renderHeaderCell(column, columnIdx);
                        
                        if(pluginOptions.renderFilters !== false && (column.filterable === undefined || column.filterable)) {
                            header.addClass("pg-filterable");
                            var filter = this.filtering.getFilter(column);
                            var timer;

                            header.append(filter.filterBox);
                            filter.on("change", function(value) {
                                if(timer) clearTimeout(timer);
                                timer = setTimeout(function() {
                                    if(value !== null && value !== undefined) {
                                        columnSettings[column.key] = value;
                                    } else {
                                        delete columnSettings[column.key];
                                    }
                                    grid.filtering.filter(columnSettings);
                                }, 1000);
                            });
                        }

                        return header;
                    },
                    
                    filterHeight: function() {
                        var filterHeights = this.target.find(".pg-columnheader .pg-filter-box").map(function(i, e) {
                            return $(e).outerHeight();
                        });
                        if(filterHeights.length > 0) {
                            return Math.max.apply(undefined, filterHeights);
                        }
                        return 0;
                    },
                    
                    headerHeight: function() {
                        return $super.headerHeight() + this.filterHeight();
                    },
                    
                    filtering: {
                        getFilter: function(arg) {
                            var column, key;
                            if(arg.key === undefined) {
                                key = arg;
                                column = grid.getColumnForKey(key);
                            } else {
                                key = arg.key;
                                column = arg;
                            }

                            if(key in filters) {
                                return filters[key];
                            } else {
                                return filters[key] = this.createFilter(column);
                            }
                        },

                        createFilter: function(column) {
                            if(column.type && pluginOptions.filterFactories && column.type in pluginOptions.filterFactories) {
                                return pluginOptions.filterFactories[column.type](column, grid, columnSettings[column.key]);
                            } else {
                                return this.createDefaultFilter(column);
                            }
                        },

                        createDefaultFilter: function(column) {
                            var listener = new utils.Evented(),
                                filterElement = utils.createElement("div", {class: "pg-filter"}),
                                filterInputElement = utils.createElement("input", {class: "pg-filter-input"}),
                                fragment = utils.createElement("div", {class: "pg-filter-box"}, [
                                    filterElement,
                                    filterInputElement
                                ]),
                                filterValue = { value: '', method: 'contains', type: 'inclusive' },
                                filter = {
                                    filterBox: fragment,
                                    on: listener.on,
                                    trigger: listener.trigger,
                                    value: filterValue,
                                    valueMatches: function(value, columnSettings, column) {
                                        var hasValue = value !== undefined && value !== null && value !== "";
                                        switch(columnSettings.method) {
                                            case "contains":
                                                return (!columnSettings.value || hasValue && (value.toLocaleUpperCase()).indexOf(columnSettings.value.toLocaleUpperCase()) > -1);
                                            case "beginsWith":
                                                return (!columnSettings.value || hasValue && value.length >= columnSettings.value.length && value.substring(0, columnSettings.value.length).toLocaleUpperCase() === columnSettings.value.toLocaleUpperCase());
                                            case "endsWith":
                                                return (!columnSettings.value || hasValue && value.length >= columnSettings.value.length && value.substring(value.length - columnSettings.value.length).toLocaleUpperCase() === columnSettings.value.toLocaleUpperCase());
                                            default: throw "Unsupported filter method " + columnSettings.method;
                                        }
                                    }
                                },
                                currentFilterPane;

                            function closeFilterPane() {
                                currentFilterPane.remove();
                                currentFilterPane = null;
                            }

                            function updateFilter() {
                                if(filterValue.value === "") {
                                    filter.trigger('change', null);
                                } else {
                                    filter.trigger('change', filterValue);
                                }
                            }

                            filterElement.addEventListener("click", function(event) {
                                var $this = $(this);

                                if(currentFilterPane) {
                                    return;
                                }

                                currentFilterPane = $("<div class='pg-filter-pane'>");

                                currentFilterPane.html(filterPane(grid.translate.bind(grid)));
                                currentFilterPane.on("click", "[data-filter-method],[data-filter-type]", function(event) {
                                    filterValue.method = $(this).attr("data-filter-method");
                                    filterValue.type = $(this).attr("data-filter-type");
                                    updateFilter();
                                    closeFilterPane();
                                });

                                currentFilterPane.css("top", $this.offset().top + "px").css("left", $this.offset().left + "px");
                                $("body").append(currentFilterPane);

                                event.preventDefault();
                                event.stopPropagation();

                                $("body").one("click", function(event) {
                                    if(currentFilterPane && $(this).parents(".pg-filter-pane").empty()) {
                                        closeFilterPane();
                                    }
                                });
                            });

                            filterInputElement.addEventListener("keyup", function(event) {
                                filterValue.value = this.value;
                                updateFilter();
                            });

                            return filter;
                        },
                        
                        filter: function(settings) {
                            columnSettings = settings;
                            grid.dataSource.applyFilter(settings, settings && this.rowMatches.bind(this, settings));
                            grid.trigger('filterchange', { settings: settings});
                        },
                        
                        rowMatches: function(settings, row) {
                            for(var x in settings) {
                                if(settings.hasOwnProperty(x)) {
                                    if (!this.getFilter(x).valueMatches(utils.getValue(row, x), settings[x], row)) {
                                        if (settings[x].type === 'inclusive' || settings[x].type === undefined) {
                                            return 0;
                                        }
                                    } else {
                                        if (settings[x].type === 'exclusive') {
                                            return -1;
                                        }
                                    }
                                }
                            }
                            return 1;
                        }
                    }
                }
            });
        }
   };
    
});
