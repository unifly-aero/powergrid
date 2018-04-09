"use strict";
define(
    ['QUnit', '../extensions/sorting', '../datasources/arraydatasource', '../datasources/sortingdatasource'],
    function (QUnit, sorting, ArrayDataSource, SortingDataSource) {
        return function () {
            QUnit.test("Test compareString", function (assert) {
                var mockgrid = {};
                sorting.init(mockgrid);

                function t(a, b) {
                    assert.equal(mockgrid.sorting.compareString(a, b), 1, a + " should > " + b);
                    assert.equal(mockgrid.sorting.compareString(b, a), -1, b + " should < " + a);
                }

                function e(a, b) {
                    assert.equal(mockgrid.sorting.compareString(a, b), 0, a + " should = " + b);
                    assert.equal(mockgrid.sorting.compareString(b, a), 0, b + " should = " + a);
                }

                e("", "");
                t("Ulalala120", "Ulalala20");
                t("Ulalala20", "U120");
                t("zazazaa", "Bababa");
                t("Zaza", "lolo");
                t("52200", "400");
                t("600000", "52200");
                t("dada", "5dada");
            });

            QUnit.test("Test rowsremoved and rowsadded", function (assert) {

                var arrayDataSource = new ArrayDataSource([
                    {id: 40},
                    {id: 20},
                    {id: 30},
                    {id: 10},
                    {id: 50}
                ]);
                var sortingDataSource = new SortingDataSource(arrayDataSource);

                function expectEvents(event, count, description, after) {
                    return new Promise(function (resolve, reject) {
                        var events = new Array(count);
                        var c = 0;
                        var subsc = sortingDataSource.on(event, function (event) {
                            events[c++] = event;
                        });
                        var timeout = setTimeout(function () {
                            subsc.cancel();
                            assert.pushResult({
                                result: c == count,
                                actual: c,
                                expected: count,
                                message: description
                            });
                            resolve(events);
                        }, 100);

                        after && after();
                    });
                }

                function comparator(a, b) {
                    return a.id - b.id;
                }

                sortingDataSource.sort(comparator);

                assert.deepEqual(sortingDataSource.getData(), [
                    {id: 10},
                    {id: 20},
                    {id: 30},
                    {id: 40},
                    {id: 50}
                ]);

                return expectEvents("rowsadded", 3, "Adding some rows", function () {
                    arrayDataSource.insert(2, [
                        {id: 15},
                        {id: 35},
                        {id: 17},
                        {id: 55}
                    ])
                }).then(function (events) {
                    assert.deepEqual(arrayDataSource.getData(), [
                        {id: 40},
                        {id: 20},
                        {id: 15},
                        {id: 35},
                        {id: 17},
                        {id: 55},
                        {id: 30},
                        {id: 10},
                        {id: 50}
                    ]);
                    assert.deepEqual(sortingDataSource.getData(), [
                        {id: 10},
                        {id: 15},
                        {id: 17},
                        {id: 20},
                        {id: 30},
                        {id: 35},
                        {id: 40},
                        {id: 50},
                        {id: 55}
                    ]);
                    assert.deepEqual(events, [
                        {start: 1, end: 3},
                        {start: 5, end: 6},
                        {start: 8, end: 9}
                    ]);

                    return expectEvents("rowsremoved", 3, "Removing some rows", function () {
                        arrayDataSource.remove(3, 6);
                    }).then(function(events) {
                        assert.deepEqual(arrayDataSource.getData(), [
                            {id: 40},
                            {id: 20},
                            {id: 15},
                            // {id: 35},
                            // {id: 17},
                            // {id: 55},
                            {id: 30},
                            {id: 10},
                            {id: 50}
                        ], "array datasource contents after remove");
                        assert.deepEqual(sortingDataSource.getData(), [
                            {id: 10},
                            {id: 15},
                            // {id: 17},
                            {id: 20},
                            {id: 30},
                            // {id: 35},
                            {id: 40},
                            {id: 50},
                            // {id: 55}
                        ], "sorted datasource contents after remove");
                        assert.deepEqual(events, [
                            {start: 8, end: 9},
                            {start: 5, end: 6},
                            {start: 2, end: 3}
                        ], "rowsremoved events after remove");
                    });
                });
            });

            QUnit.test("Test fallback to natural order", function(assert) {

                var r1 = {id: 0, firstname: "John", lastname: "Doe"};
                var r2 = {id: 4, firstname: "John", lastname: "Williams"};
                var r3 = {id: 1, firstname: "John", lastname: "Deer"};
                var r4 = {id: 2, firstname: "John", lastname: "Eboy"};
                var r5 = {id: 5, firstname: "Johnny", lastname: "Johnson"};
                var r6 = {id: 3, firstname: "John", lastname: "Lasseter"};
                var r7 = {id: 5, firstname: "Angus", lastname: "Black"};
                var arrayDataSource = new ArrayDataSource([
                    r1,
                    r2,
                    r3,
                    r4,
                    r5,
                    r6,
                    r7
                ]);

                var sorting = new SortingDataSource(arrayDataSource);

                function byName(a,b) {
                    if(a.firstname < b.firstname) {
                        return -1;
                    } else if(a.firstname > b.firstname) {
                        return 1;
                    } else {
                        return 0;
                    }
                }

                sorting.sort(byName);

                assert.deepEqual(sorting.getData(), [
                    r7, r1, r2, r3, r4, r6, r5
                ])
            });
        };
    }
);
