/**
 * Filtering for date fields
 * Enabled when column is of type 'date' or 'datetime'
 * By default this uses a HTML5 date field, which is very limited and not widely supported, but does not impose new
 * dependencies. This can be overridden using the plugin options, by providing a createField function, as in the example
 * below that uses bootstrap-datetimepicker
 *
 * 'filtering_date': {
 *      createField: function(value, type, callback, fieldName) {
 *          let f = document.createElement("input");
 *          $(f).datetimepicker();
 *          let dp = $(f).data('DateTimePicker');
 *          dp.date(value);
 *          $(f).on("dp.change", function(e) {
 *              callback(e.date ? e.date.toDate() : null);
 *          });
 *          return f;
 *      }
 *  }
 *
 *  - value: initial value for the field
 *  - type: 'date' or 'datetime' depending on the column type
 *  - callback: callback to invoke when the value of the field changes
 *  - fieldName: 'before' or 'after'
 */

define(['../override', '../utils'], function(override, utils) {

    "use strict";

    var defaults = {
        filterBoxClass: "pg-filter-box",
        filterClass: "pg-filter",
        filterInputClass: "pg-filter-input",
        filterOptionsClass: "pg-filter-optionpane",
        filterDropDownClass: "pg-filter-dropdown",
        filterOpenDropDownClass: "pg-filter-dropdown-open",
        filterFormClass: "pg-filter-form",
        fieldType: "number"
    };

    function createEditor(type, options) {
        return function(column, grid) {
            var
                pluginOptions = Object.assign({}, defaults, grid.options.extensions.filtering_scalar.defaults, grid.options.extensions.filtering_scalar.types[type]),
                filterBox = utils.createElement("div", {"class": pluginOptions.filterBoxClass}),
                filter = utils.createElement("div", {"class": pluginOptions.filterClass}),
                select = utils.createElement("div", {"class": pluginOptions.filterInputClass}),
                listener = new utils.Evented(),
                filterSettings = {
                    minimum: null,
                    maximum: null,
                    method: 'scalar'
                },
                filterObj = {
                    filterBox: filterBox,
                    on: listener.on,
                    trigger : listener.trigger,
                    valueMatches: function(value, columnSettings) {
                        return value && (columnSettings.minimum === null || value >= columnSettings.minimum) && (columnSettings.maximum === null || columnSettings.maximum > value);
                    }
                };

            function format(value) {
                return grid.getCellTextValue(value, null, column);
            }

            function updateFilter() {
                if(filterSettings.minimum !== null && filterSettings.maximum !== null) {
                    select.textContent = format(filterSettings.minimum) + " - " + format(filterSettings.maximum);
                } else if(filterSettings.minimum !== null) {
                    select.textContent = ">= " + format(filterSettings.minimum);
                } else if(filterSettings.maximum !== null) {
                    select.textContent = "< " + format(filterSettings.maximum);
                } else {
                    select.textContent = "";
                }
                filterObj.trigger("change", (filterSettings.minimum !== null || filterSettings.maximum !== null) ? filterSettings : null);
            }

            function createField(value, callback, fieldName) {
                if(pluginOptions.createField) {
                    return pluginOptions.createField(value, type, callback, fieldName);
                } else {
                    var dateField = utils.createElement("input", {type: (options && options.fieldType || 'number')});
                    var fieldAttribute = options && options.fieldAttribute || 'value';
                    dateField[fieldAttribute] = value;
                    dateField.addEventListener("change", function(event) {
                        var val = dateField[fieldAttribute];
                        if(val === "") {
                            val = null;
                        }
                        callback(val);
                    });
                    return dateField;
                }
            }

            function createOptionPane() {
                var maximumField = createField(filterSettings.maximum, function(value) {
                        filterSettings.maximum = value;
                        updateFilter();
                    }, grid.translate('filtering.max')),
                    minimumField = createField(filterSettings.minimum, function(value) {
                        filterSettings.minimum = value;
                        updateFilter();
                    }, grid.translate('filtering.min')),
                    minimumLabel = utils.createElement("label", [utils.createElement("span", grid.translate('filtering' + options.minimumLabel ? options.minimumLabel.toLowerCase() : 'min')), minimumField]),
                    maximumLabel = utils.createElement("label", [utils.createElement("span", grid.translate('filtering.' + options.maximumLabel ? options.maximumLabel.toLowerCase() : 'max')), maximumField]),
                    form = utils.createElement("form", {"class": pluginOptions.filterFormClass},
                        [ minimumLabel, maximumLabel ]),
                    pane = utils.createElement("div", {"class": pluginOptions.filterOptionsClass},
                        [ form ]
                    ),
                    optionsDropDown = utils.createElement("div", {"class": pluginOptions.filterDropDownClass}, [pane]);
                return optionsDropDown;
            }

            filterBox.addEventListener('click', function() {
                var optionDropDown = createOptionPane();
                optionDropDown.classList.add(pluginOptions.filterOpenDropDownClass);
                document.body.appendChild(optionDropDown);
                var offset = utils.offset(this);
                Object.assign(optionDropDown.style, {
                    left: offset.left + "px",
                    position: 'absolute',
                    top: (offset.top + this.offsetHeight) + "px"
                });

                optionDropDown.addEventListener("mousedown", function(event) {
                    event.stopPropagation();
                });
                utils.addSingleUseEventListener(document.body, "mousedown", function() {
                    optionDropDown.remove();
                });
            });

            filterBox.appendChild(filter);
            filterBox.appendChild(select);

            return filterObj;
        }
    }

    return {
        init: function(grid, pluginOptions) {
            for(var type in pluginOptions.types) {
                grid.options.extensions.filtering.filterFactories[type] = createEditor(type, pluginOptions.types[type]);
            }
        },
        requires: {
            filtering: true
        }
    };
});
