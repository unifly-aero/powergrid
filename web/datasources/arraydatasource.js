import utils from "../utils.js";

class ArrayDataSource {
    constructor(data, delay) {
        utils.Evented.apply(this);

        if (delay) {
            setTimeout(this.load.bind(this, data), delay);
        } else {
            if (data) {
                this.load(data);
            }
        }
    }

    load(data) {
        if (data !== undefined) {
            this.data = data;
        }

        for (var x = 0, l = this.data.length; x < l; x++) {
            if (this.data[x].id === undefined) {
                this.data[x].id = x;
            }
        }

        this.ready = true;
        this.trigger("dataloaded");
    }

    recordCount() {
        this.assertReady();
        return this.data.length;
    }

    getRowByIndex(idx) {
        this.assertReady();
        return this.data[idx];
    }

    getRecordById(id) {
        this.assertReady();
        for (var x = 0, l = this.data.length; x < l; x++) {
            if (this.data[x].id == id) return this.data[x];
        }
    }

    insert(index, rows) {
        this.data.splice.apply(this.data, [index, 0].concat(rows));
        this.trigger('rowsadded', {start: index, end: index + rows.length});
    }

    remove(start, end) {
        this.data.splice(start, (end === undefined ? 1 : end - start));
        this.trigger('rowsremoved', {start: start, end: end});
    }

    getData(start, end) {
        this.assertReady();
        if (start === undefined && end === undefined) return this.data;
        if (start === undefined || start === null) start = 0;
        if (end === undefined) end = this.recordCount();
        return this.data.slice(start, end);
    }

    setValue(rowId, key, value) {
        this.assertReady();
        utils.setValue(this.getRecordById(rowId), key, value);
        this.trigger("datachanged", {values: [{id: rowId, key: key}]});
    }

    assertReady() {
        if (!this.isReady()) throw Error("Datasource not ready yet");
    }

    isReady() {
        return this.ready;
    }

    sort(comparator) {
        this.assertReady();
        this.data.sort(comparator);
        this.trigger("dataloaded");
    }

    replace(record) {
        var data = this.data,
            existingRow = data.find(function (r) {
                return r.id == record.id;
            });
        if (existingRow !== undefined) {
            data.splice(data.indexOf(existingRow), 1, record);
            this.trigger("datachanged", {rows: [record]})
        }
    }
}

export default ArrayDataSource;
