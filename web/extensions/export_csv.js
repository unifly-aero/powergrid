define(['../jquery','../override', '../utils', '../promise'], function($, override, utils, Promise) {
    "use strict";

    return {
        init: function(grid, pluginOptions) {
            override(grid, function() {
                var autodownload = pluginOptions.autodownload;

                return {
                    export_csv: function(fn) {
                        var self = this;
                        return this.toCsvString().then(function(csv) {
                            return self.toFile(csv, fn);
                        });
                    },

                    toCsvString: function() {
                        return new Promise(function(resolve) {

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
                        return new Promise(function(resolve) {
                            var filename = fn || 'export.csv';
                            var blob = new Blob([csv], {"type" : "data:text/csv;charset=utf-8"});

                            if (autodownload) {
                                var url = window.URL.createObjectURL(blob);
                                var a = document.createElement("a");
                                a.href = url;
                                a.download = filename;
                                a.click();
                            }

                            resolve({blob: blob, filename: fn});
                        });

                    }
                }

            });
        }

    };
    
});
