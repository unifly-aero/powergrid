import utils from "../utils.js";

var SUMMARY_ROW_ID = "summary_row";

class SummarizingDataSource {
    constructor(delegate, summaryFactory) {
        utils.Evented.apply(this);

        var self = this;
        this.delegate = delegate;
        this.view = null;
        this.summaryFactory = summaryFactory;

        delegate.on("dataloaded", function () {
            self.trigger("dataloaded");
        });

        delegate.on("datachanged", function (data) {
            self.trigger("datachanged", data);
        });

        utils.passthrough(this, delegate, ['sort', 'group', 'applyFilter', 'commitRow', 'startEdit', 'rollbackRow', 'replace']);
    }

    isReady() {
        return this.delegate.isReady();
    }

    reload() {
        this.delegate.reload();
    }

    recordCount() {
        return utils.map(this.delegate.recordCount(), function (rc) {
            return rc + 1
        });
    }

    getData(start, end) {
        var rc = this.delegate.recordCount(),
            self = this;
        return utils.map(rc, function (rc) {
            if (start == rc) {
                var s = self.getSummaryRow();
                if (typeof s.then === 'function') {
                    return s.then(function (r) {
                        return [r];
                    });
                } else {
                    return [s];
                }
            } else if ((start === undefined && end === undefined) || (end !== undefined && end > rc)) {
                var r = self.delegate.getData(start, end), s = self.getSummaryRow();
                if (typeof r.then === 'function' || typeof s.then === 'function') {
                    return Promise.all([r, s]).then(function (r) {
                        return r[0].concat([r[1]]);
                    });
                } else {
                    return r.concat([self.getSummaryRow()]);
                }
            } else {
                return self.delegate.getData(start, end);
            }
        });
    }

    setValue(rowId, key, value) {
        this.delegate.setValue(rowId, key, value);
    }

    assertReady() {
        this.delegate.assertReady();
    }

    getRecordById(id) {
        if (id == SUMMARY_ROW_ID) {
            return this.getSummaryRow();
        } else {
            return this.delegate.getRecordById(id);
        }
    }

    getSummaryRow() {
        var sr;
        if (this.summaryFactory) {
            sr = this.summaryFactory(this.delegate);
        } else if (this.delegate.getSummaryRow) {
            sr = this.delegate.getSummaryRow();
        } else {
            throw "To create a summary row either implement getSummaryRow() on the datasource or pass a summaryFactory to the 'summarize' options";
        }
        if (typeof sr.then === 'function') {
            return sr.then(function (sr) {
                sr.id = SUMMARY_ROW_ID;
                return sr;
            });
        } else {
            sr.id = SUMMARY_ROW_ID;
            return sr;
        }
    }
}

export default SummarizingDataSource;
