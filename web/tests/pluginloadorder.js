import PowerGrid from "../powergrid.js";

describe("PowerGrid", function () {
    it("It sorts plugins in the right order", function () {
        var pg = new PowerGrid(false, {
            extensions: {
                'columnsizing': {},
                'columnmoving': {},
                'editing': true,
                'grouping': {},
                'sorting': true,
                'filtering': {}
            }
        });

        return new Promise((resolve, reject) => {
            pg.loadExtensions(function (pluginList, plugins) {
                var sorted = pg.sortByLoadOrder(pluginList, plugins);
                expect(sorted.indexOf("dragging") < sorted.indexOf("sorting")).toBeTrue();
                resolve();
            });
        });
    });
});
