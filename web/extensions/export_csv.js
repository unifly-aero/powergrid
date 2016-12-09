/**
 * Will display columns with type "checkbox" or "radio" as respective inputs
 */
define(['../jquery','../override', '../utils', '../promise', 'filesaver'], function($, override, utils, Promise) {
    "use strict";

    return {
        init: function(grid, pluginOptions) {
            override(grid, function($super) {


                return {
                    init: function() {
                        $super.init();

                    },

                    export_csv: function(fn) {
                        var self = this;
                        return this.toCsvString().then(function(csv) {
                            return self.toFile(csv, fn);
                        });
                    },

                    toCsvString: function() {
                        return new Promise(function(resolve, reject) {

                            var ds = grid.dataSource;
                            var header = [], csv = "";

                            grid.options.columns.forEach(function(col) {
                                header.push(col.title);
                            });

                            csv += header.join(",");
                            csv += "\n";

                            for (var i=0;i<ds.recordCount();i++) {
                                csv += ds.getRecordById(i).join(",");
                                csv += "\n"
                            }

                            resolve(csv);

                        });
                    },

                    toFile: function(csv, fn) {
                        return new Promise(function(resolve, reject) {
                            var filename = fn || 'export.csv';
                            var blob = new Blob([csv], {"type" : "data:text/csv;charset=utf-8"});
                            var url = window.URL.createObjectURL(blob);
                            var a = document.createElement("a");
                            a.href = url;
                            a.download = filename;
                            a.click();

                            resolve({blob: blob, filename: fn});
                        });

                    }
                }

            });
        }

    };
    
});
