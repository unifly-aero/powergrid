import utils from "../utils.js";

class JSONDataSource {
    constructor(settings) {
        utils.Evented.apply(this);

        this.settings = settings;
        this.load();
        this.data = undefined;
    }

    assertReady() {
        if (!this.isReady()) {
            throw "Datasource not yet ready";
        }
    }

    isReady() {
        return this.data !== undefined;
    }

    load() {
        var self = this;
        $.getJSON(this.settings.url)
            .done(function (data) {
                self.data = data.data;
                self.trigger("dataloaded");
            });
    }

    recordCount() {
        this.assertReady();
        return this.data.length;
    }

    getData(start, end) {
        this.assertReady();
        if (!start && !end) {
            return this.data;
        } else {
            return this.data.slice(start, end);
        }
    }

    getRecordById(rowId) {
        this.assertReady();
        return this.data.filter(function (e) {
            return e.id == rowId;
        })[0];
    }

    setValue(rowId, key, value) {
        this.assertReady();
        this.getRecordById(rowId)[key] = value;
    }
}

export default JSONDataSource
