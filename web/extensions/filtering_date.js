/***
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
 *  - fieldName: 'minimum' or 'maximum'
 */

define([], function() {

    "use strict";
    return {
        init: function(grid, pluginOptions) {
            grid.options.extensions.filtering_scalar.types.datetime.createField = pluginOptions.createField;
            grid.options.extensions.filtering_scalar.types.date.createField = pluginOptions.createField;
        },
        requires: {
            filtering_scalar: {
                types: {
                    datetime: {fieldAttribute: 'valueAsDate', fieldType: 'date', minimumLabel: "After", maximumLabel: "Before"},
                    date: {fieldAttribute: 'valueAsDate', fieldType: 'date', minimumLabel: "After", maximumLabel: "Before"}
                }
            }
        }
    };
});
