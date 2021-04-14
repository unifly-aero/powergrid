import override from "../override.js";
import utils from "../utils.js";
import treegrid from "../extensions/treegrid.js";
import DragNDrop from "../dragndrop.js";
import GroupingDataSource from "../datasources/groupingdatasource.js";
import grouperTemplate from "../templates/grouper.js";
import grouprow from "../templates/grouprow.js";
import groupindicator from "../templates/groupindicator.js"
import SyncTreeGridDataSource from "../datasources/synctreegriddatasource.js";

export default {
    conflicts: ['treegrid'],
    requires: {
        dragging: {
            allowDragOutsideOfViewPort: true
        },
        treegrid: {
            autoTreeDataSource: false
        }
    },
    init: function (grid, pluginOptions) {

        var origds = grid.dataSource,
            groupingds = (typeof origds.group === 'function' ? origds : new GroupingDataSource(origds)),
            treeds = (typeof origds.group === 'function' ? origds : new SyncTreeGridDataSource(groupingds));

        grid.dataSource = treeds;

        return override(grid, function ($super) {
            return {
                init: function () {
                    var groupKeys = grid.loadSetting("grouping"),
                        groupSettings;
                    if ((!groupKeys || groupKeys.length === 0) && pluginOptions.defaultGroupedColumns) {
                        groupKeys = pluginOptions.defaultGroupedColumns;
                    }

                    if (pluginOptions.fixedGroupedColumns) {
                        this.grouping.fixedGroups = pluginOptions.fixedGroupedColumns.map(this.getColumnForKey.bind(this)).filter(utils.notNull);
                    }

                    if (groupKeys) {
                        if (pluginOptions.fixedGroupedColumns) {
                            groupKeys = groupKeys.filter(function (k) {
                                return pluginOptions.fixedGroupedColumns.indexOf(k) == -1;
                            });
                        }
                        groupSettings = groupKeys.map(this.getColumnForKey.bind(this)).filter(utils.notNull);
                        if (groupSettings !== undefined && groupSettings !== null && groupSettings !== "") {
                            this.grouping.groups = groupSettings;
                        }
                    }

                    groupingds.group(this.grouping.groupColumns());

                    $super.init();

                    if (origds.isReady() && !groupingds.isReady()) {
                        groupingds.load();
                    }

                    this.container.on("click", ".pg-grouping-grouptoggle", function (event) {
                        var toggle = this,
                            groupId = $(toggle).attr("data-id");

                        treeds.toggle(groupId);
                    });

                    var grouper = this.grouping.initGrouperElement();

                    if (this.grouping.groups) {
                        if (pluginOptions.indicatorForFixedGroups !== false) {
                            this.grouping.fixedGroups.forEach(function (e) {
                                grouper.append(grid.grouping.renderGroupIndicator(e, false));
                            });
                        }
                        this.grouping.groups.forEach(function (e) {
                            grouper.append(grid.grouping.renderGroupIndicator(e, true));
                        });
                    }

                    grouper.on("click", ".pg-group-delete", function (event) {
                        grid.grouping.removeGroupBy(grid.getColumnForKey($(this).attr("data-group-key")));
                        event.stopPropagation();
                        event.stopImmediatePropagation();
                        event.preventDefault();
                    }).on("mousedown", ".pg-group-delete", utils.cancelEvent);

                    this.grouping.initReordering(grouper);

                    this.grouping.grouper = grouper;

                    grouper.on("columndropped", function (event) {
                        grid.grouping.addGroupBy(event.column);
                    }).on("columndragenter", function (event) {
                        if (event.column.groupable === false || grid.grouping.groupColumns().indexOf(event.column) > -1) {
                            event.preventDefault();
                        }
                    });
                },

                headerContainerHeight: function () {
                    return $super.headerContainerHeight() + (this.target.find(".pg-grouper").outerHeight() || 0);
                },

                renderRowToParts: function (record, rowIdx, rowFixedPartLeft, rowScrollingPart, rowFixedPartRight) {
                    if (this.grouping.isGroupRow(record)) {
                        var firstPart = rowFixedPartLeft || rowScrollingPart || rowFixedPartRight;
                        $(firstPart).addClass("pg-grouping-grouprow");

                        var groupToggle = document.createElement("span");
                        groupToggle.className = "pg-grouping-grouptoggle pg-tree-level-" + record._groupLevel;
                        groupToggle.setAttribute("data-id", record.id);

                        $(firstPart).empty().append(groupToggle).append((pluginOptions.renderGroupRow || this.grouping.renderGroupRow)(record._groupColumn, record));
                    } else {
                        $super.renderRowToParts(record, rowIdx, rowFixedPartLeft, rowScrollingPart, rowFixedPartRight);
                    }
                },

                isColumnHidden: function (column) {
                    return $super.isColumnHidden(column) || ((pluginOptions.hideGroupedColumns && column.hideWhenGrouped !== false || column.hideWhenGrouped) && (this.grouping.fixedGroups.indexOf(column) > -1 || this.grouping.groups.indexOf(column) > -1));
                },

                grouping: {
                    groups: [],
                    fixedGroups: [],

                    initGrouperElement: function () {
                        if (pluginOptions.grouper) {
                            return $(pluginOptions.grouper);
                        }
                        var grouper = $(grouperTemplate(grid.translate.bind(grid)));
                        grid.columnheadercontainer.addClass("pg-grouping-enabled").prepend(grouper);
                        return grouper;
                    },

                    initReordering: function (grouper) {
                        new DragNDrop(grouper, ".pg-group-indicator.pg-draggable", ".pg-group-indicator.pg-draggable");

                        var newOrder;

                        grouper.on("customdragstart", function (event) {
                        }).on("customdragover", ".pg-group-indicator.pg-draggable", function (event) {
                            var targetKey = $(this).attr("data-group-key"),
                                dragKey = $(event.dragee).attr("data-group-key"),
                                gKeys = (newOrder || grid.grouping.groups).map(function (e) {
                                    return e.key;
                                }),
                                tIdx = gKeys.indexOf(targetKey),
                                dIdx = gKeys.indexOf(dragKey);

                            if (tIdx < dIdx && event.pageX < ($(this).offset().left + $(event.dragee).outerWidth())) {
                                $(this).before(event.dragee.detach());
                            } else if (dIdx < tIdx) {
                                $(this).after(event.dragee.detach());
                            }
                            newOrder = grouper.children(".pg-group-indicator").map(function (i, e) {
                                return grid.getColumnForKey($(e).attr("data-group-key"));
                            }).toArray();
                        }).on("customdragend", ".pg-group-indicator", function (event) {
                            if (newOrder !== undefined) {
                                grid.grouping.groups = newOrder;
                                grid.grouping.updateGroups();
                                newOrder = undefined;
                            }
                        });
                    },

                    addGroupBy: function (column) {
                        this.groups.push(column);
                        this.grouper.append(this.renderGroupIndicator(column, true));
                        this.updateGroups();
                    },

                    removeGroupBy: function (column) {
                        var indicator = this.grouper.find(".pg-group-indicator[data-group-key='" + column.key + "']");
                        indicator.remove();
                        this.groups.splice(this.groups.indexOf(column), 1);
                        this.updateGroups();
                    },

                    updateGroups: function () {
                        var allGroups = this.groupColumns();
                        groupingds.group(allGroups);
                        grid.trigger("groupingchanged", this.groups);
                        grid.target.attr("data-group-leaf-level", allGroups.length);
                        if (groupingds.isReady()) {
                            grid.updateColumns(false);
                        }
                        grid.saveSetting("grouping", this.groups.map(function (column) {
                            return column.key;
                        }));
                    },

                    renderGroupIndicator: function (column, removable) {
                        var indicator = groupindicator({column: column, removable: removable});
                        if (removable) {
                            indicator.classList.add("pg-draggable");
                        }
                        return indicator;
                    },

                    renderGroupRow: function (column, record) {
                        return $(grouprow({
                            record: record,
                            column: record._groupColumn,
                            value: grid.getCellTextValue(record.description, null, record._groupColumn)
                        }));
                    },

                    groupColumns: function () {
                        return this.fixedGroups.concat(this.groups);
                    },

                    isGroupRow: function (row) {
                        return row.groupRow;
                    }
                }
            };
        });
    }
}
