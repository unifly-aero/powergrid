import utils from "../utils.js";

class SortingDataSource {
    constructor(delegate) {
        utils.Evented.apply(this);

        var self = this;
        this.delegate = delegate;

        if (typeof delegate.applyFilter === 'function') {
            this.applyFilter = delegate.applyFilter.bind(delegate);
        }

        delegate.on("dataloaded", function () {
            self.reload();
            self.trigger("dataloaded");
        });

        delegate.on("datachanged", function (data) {
            self.reload();
            self.trigger("datachanged", data);
        });

        delegate.on("rowsadded", function (data) {
            if (!self.handleDataChanges()) {
                self.trigger('rowsadded', data);
            }
        });

        delegate.on("rowsremoved", function (data) {
            if (!self.handleDataChanges()) {
                self.trigger('rowsremoved', data);
            }
        });

        if (delegate.isReady()) {
            this.reload();
        }

        utils.passthrough(this, delegate, ['commitRow', 'startEdit', 'rollbackRow', 'replace']);
    }

    view = null;

    isReady() {
        return this.view != null;
    }

    reload() {
        this.delegate.assertReady();
        if (this.comparator) {
            var data = this.delegate.getData();
            this.prevData = data.concat([]);
            var indexMap = data.map(function (r, i) {
                return {
                    index: i,
                    record: r
                }
            });
            var comparator = this.comparator;

            function compare(a, b) {
                var r = comparator(a.record, b.record);
                if (r == 0) {
                    return a.index - b.index;
                } else {
                    return r;
                }
            }

            indexMap.sort(compare);
            this.view = indexMap.map(function (i) {
                return data[i.index];
            });
        } else {
            this.view = this.delegate.getData().concat([]);
        }
    }

    recordCount() {
        this.assertReady();
        return this.view.length;
    }

    getData(start, end) {
        this.assertReady();
        if (start === undefined && end === undefined) return this.view;
        if (start === undefined) start = 0;
        if (end === undefined) end = this.recordCount();
        return this.view.slice(start, end);
    }

    getValue(rowId, key) {
        return this.delegate.getValue(rowId, key);
    }

    setValue(rowId, key, value) {
        this.delegate.setValue(rowId, key, value);
    }

    assertReady() {
        if (!this.isReady()) throw Error("Datasource not ready yet");
    }

    buildStatistics() {
        return this.delegate.buildStatistics();
    }

    getRecordById(id) {
        return this.delegate.getRecordById(id);
    }

    sort(comparator) {
        this.comparator = comparator;
        this.reload();
        this.trigger("dataloaded");
    }

    handleDataChanges() {
        if (this.comparator) {
            var oldView = this.view;
            this.reload();
            utils.incrementalUpdate(this, oldView, this.view);
            return true;
        } else {
            return false;
        }
    }
}

export default SortingDataSource;
