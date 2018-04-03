define(['../utils'], function (utils) {
    // given an array, finds the index of the first element that is equal to or greater than the given value
    function findIndex(arr, value) {
        for(var x=0,l=arr.length;x<l;x++) {
            if(value <= arr[x]) return x;
        }
        return arr.length;
    }

    // in an array, increment all elements by the given increment starting at the given index
    function incArray(arr, startIndex, increment) {
        for(var x=startIndex,l=arr.length;x<l;x++) {
            arr[x] += increment;
        }
    }

    // check if both arrays contain the same rows
    function arrayEqual(a, b) {
        if(a.length != b.length) {
            return false;
        }
        for(var i=0,l=a.length;i<l;i++) {
            if(a[i].id != b[i].id) return false;
        }
        return true;
    }

    function FilteringDataSource(delegate) {
        utils.Evented.apply(this);

        var self = this;
        this.delegate = delegate;

        delegate.on("dataloaded", function () {
            self.reload();
            self.trigger("dataloaded");
        });

        delegate.on("datachanged", function (data) {
            self.reload();
            self.trigger("datachanged", data);
        });

        delegate.on("rowsadded", function(data) {
            self._handleRowsAdded(data.start, data.end);
        });
        delegate.on("rowsremoved", function(data) {
            self._handleRowsRemoved(data.start, data.end);
        });

        if (delegate.isReady()) {
            this.reload();
        }

        utils.passthrough(this, delegate, ['sort','commitRow','startEdit','rollbackRow','replace']);
    }

    FilteringDataSource.prototype = {
        view: null,

        isReady: function () {
            return this.view != null;
        },

        reload: function () {
            this.delegate.assertReady();
            var data = this.delegate.getData();
            this.updateView();
        },

        recordCount: function () {
            this.assertReady();
            return this.view.length;
        },

        getData: function (start, end) {
            this.assertReady();
            if (start === undefined && end === undefined) return this.view;
            if (start === undefined) start = 0;
            if (end === undefined) end = this.recordCount();
            return this.view.slice(start, end);
        },

        setValue: function (rowId, key, value) {
            this.delegate.setValue(rowId, key, value);
        },

        assertReady: function () {
            if (!this.isReady()) throw Error("Datasource not ready yet");
        },

        buildStatistics: function () {
            return {
                actualRecordCount: this.delegate && this.delegate.recordCount()
            };
        },

        updateView: function () {
            var sourceData = this.delegate.getData(),
                view = new Array(sourceData.length),
                indexMap = new Array(sourceData.length),
                c = 0;

            for (var x = 0, l = sourceData.length; x < l; x++) {
                var row = sourceData[x];
                if (this.filter(row)) {
                    indexMap[c] = x;
                    view[c++] = row;
                }
            }

            this.view = view;
            this.indexMap = indexMap;
            return view;
        },

        applyFilter: function (settings, filter) {
            var oldView = this.view;
            this.filter = filter;
            this.settings = settings;

            var newView = this.updateView();

            if(!arrayEqual(oldView, newView)) {
                utils.incrementalUpdate(this, oldView, newView);
            }
        },

        getRecordById: function (id) {
            return this.delegate.getRecordById(id);
        },

        _handleRowsAdded: function(start, end) {
            var targetStart = findIndex(this.indexMap, start);
            var newData = this.delegate.getData(start, end);
            if(this.filter) {
                var targetEnd=targetStart;
                for(var x=0;x<end-start;x++) {
                    if(this.filter(newData[x])) {
                        this.indexMap.splice(targetEnd, 0, start + x);
                        this.view.splice(targetEnd++, 0, newData[x]);
                    }
                }
                incArray(this.indexMap, targetEnd, end - start);
                this.trigger('rowsadded', {start: targetStart, end: targetEnd});
            } else {
                this.view.splice.apply(this.view, [targetStart, 0].concat(newData));
                this.indexMap.splice.apply(this.indexMap, [targetStart, 0].concat(newData.map(function(e,i) {
                    return i+start;
                })));
                incArray(this.indexMap, targetStart + newData.length, end-start);
                this.trigger('rowsadded', {start: targetStart, end: targetStart + newData.length});
            }
        },

        _handleRowsRemoved: function(start, end) {
            var targetStart = findIndex(this.indexMap, start),
                targetEnd = findIndex(this.indexMap, end);
            incArray(this.indexMap, targetStart, start - end);
            if(targetEnd > targetStart) {
                this.view.splice(targetStart, targetEnd);
                this.indexMap.splice(targetStart, targetEnd);
                this.trigger('rowsremoved', {start: targetStart, end: targetEnd});
            }
        }
    };

    return FilteringDataSource;
});
