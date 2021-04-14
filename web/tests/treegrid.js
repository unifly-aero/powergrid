import SyncTreeGridDataSource from "../datasources/synctreegriddatasource.js";
import ArrayDataSource from "../datasources/arraydatasource.js";
import utils from "../utils.js";
import DefaultTreeSource from "../datasources/defaulttreesource.js";

describe("Treegrid", function () {
    it("Tree collapsing and expanding", function () {
        var data = [
            {id: 0, d: "A"},
            {id: 1, d: "B"},
            {id: 2, parent: 1, d: "X"},
            {id: 3, parent: 1, d: "J"},
            {id: 4, parent: 3, d: "K"},
            {id: 5, parent: 3, d: "M"},
            {id: 6, parent: 3, d: "L"},
            {id: 7, parent: 6, d: "Z"},
            {id: 8, parent: 3, d: "J"},
            {id: 9, d: "N"}
        ];
        var dds = new ArrayDataSource(data);
        var ds = new SyncTreeGridDataSource(new DefaultTreeSource(dds));

        function check(ds, expectedIds, message) {
            utils.handleAnimationFrames();
            return Promise.resolve(ds.getData()).then(function (data) {
                var ids = data.map(function (e) {
                    return e.id;
                });
                console.log(message, ids);
                expect(ids).toEqual(expectedIds);
            });
        }

        return Promise.resolve(ds.expandToLevel(1)).then(function () {
            return check(ds, [0, 1, 2, 3, 9], "initial tree depth");
        }).then(function () {
            return ds.toggle(6);
        }).then(function () {
            return check(ds, [0, 1, 2, 3, 9], "after toggle 6");
        }).then(function () {
            return ds.toggle(3);
        }).then(function () {
            return check(ds, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "after toggle 3");
        }).then(function () {
            return ds.toggle(6);
        }).then(function () {
            return check(ds, [0, 1, 2, 3, 4, 5, 6, 8, 9], "after collapse 6");
        }).then(function () {
            return ds.toggle(1);
        }).then(function () {
            return check(ds, [0, 1, 9], "after collapse 1");
        }).then(function () {
            return ds.expandAll();
        }).then(function () {
            return check(ds, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "after expand all");
        })
    });

    it("Tree sorting", function () {
        var data = [
            {id: 0, d: "B"},
            {id: 1, d: "A"},
            {id: 2, parent: 1, d: "X"},
            {id: 3, parent: 1, d: "J"},
            {id: 4, parent: 3, d: "K"},
            {id: 5, parent: 3, d: "M"},
            {id: 6, parent: 3, d: "L"},
            {id: 7, parent: 6, d: "Z"},
            {id: 8, parent: 3, d: "J"},
            {id: 9, d: "N"}
        ];
        var dds = new ArrayDataSource(data);
        var ds = new SyncTreeGridDataSource(new DefaultTreeSource(dds));

        function check(ds, expectedIds, message) {
            return Promise.resolve(ds.getData()).then(function (data) {
                var ids = data.map(function (e) {
                    return e.id;
                });
                expect(ids).toEqual(expectedIds);
            });
        }

        return Promise.resolve(ds.expandToLevel(3)).then(function () {
            return check(ds, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], "initial tree depth");
        }).then(function () {
            ds.sort(function (a, b) {
                return a.d < b.d ? -1 : a.d > b.d ? 1 : 0;
            });

            return check(ds, [1, 3, 8, 4, 6, 7, 5, 2, 0, 9], "after sort");
        });
    });
});
