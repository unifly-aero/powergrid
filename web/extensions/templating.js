/**
 * Enables templating of cells, based on JsRender
 *
 *
 *  One additional column option is supported:
 *   - template: the template markup string, this will be replaced by the compiled template during initialization
 *
 *  The template will have access to the following data:
 *   - 'column.key': the formatted cell value
 *  The template will have access to the following helpers:
 *   - record: the complete record
 *   - column: the columnsettings
 *
 */

import override from "../override.js";

export default function (grid, pluginOptions) {
    override(grid, function ($super) {
        return {

            init: function init() {
                $super.init.apply(this, arguments);
            },

            renderCellValue: function renderCellValue(record, column, value) {
                if (column.template !== undefined && column.template !== null) {
                    var data = $.extend({}, record);
                    data[column.key] = value;
                    var element = document.createElement("span");
                    element.innerHTML = column.template(record, column);
                    return element;
                } else {
                    return $super.renderCellValue.apply(this, arguments);
                }
            }
        }
    });
}
