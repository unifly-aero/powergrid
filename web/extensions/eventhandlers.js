define(['../override', '../jquery',], function(override, $) {
    "use strict";

    return function(grid, pluginOptions) {
        override(grid, function($super) {
            return {
                init: function init() {
                    $super.init.apply(this, arguments);

                    var container = this.container[0];
                    if(pluginOptions.row && pluginOptions.row.click) {
                        container.addEventListener("click", function (event) {
                            var row = event.target.closest("[data-row-id]");
                            if(row) {
                                var rowId = row.getAttribute("data-row-id");
                                pluginOptions.row.click(rowId);
                            }
                        });
                    }
                }
            }
        });
    };
});
