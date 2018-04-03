"use strict";

define(
    ['QUnit', '../datasources/synctreegriddatasource', '../extensions/filtering', '../datasources/arraydatasource', '../datasources/defaulttreesource',
    '../datasources/filteringdatasource'],
    function (QUnit, SyncTreeGridDataSource, filtering, ArrayDataSource, DefaultTreeSource, FilteringDataSource) {
        return function () {
            QUnit.test("3 deep treegrid filtering with inclusive and exclusive", function (assert) {
                var tree = [
                    {
                        id: 1, d: "Cruft foods", e: "B", children: [
                        {
                            id: 2, d: "IRAC7055i", e: "F", children: [
                            {id: 21, d: "IRAdvance"}
                        ]
                        },
                        {
                            id: 3, d: "ImagePRESS", e: "F", children: [
                            {id: 31, d: "IP550"}
                        ]
                        }
                    ]
                    },

                    {
                        id: 4, d: "Nettles", e: "B", children: [
                        {
                            id: 5, d: "IRAC7055i", e: "F", children: [
                            {id: 51, d: "IRAdvance"},
                            {id: 52, d: "Black & White"}
                        ]
                        },
                        {
                            id: 6, d: "IRAC7055i", e: "F", children: [
                            {id: 61, d: "Color"}
                        ]
                        }
                    ]
                    },

                    {
                        id: 7, d: "Swish Hair", e: "C", children: [
                        {id: 8, d: "ImagePRESS", e: "A"}
                    ]
                    }
                ];

                var ds = new SyncTreeGridDataSource(new DefaultTreeSource(new ArrayDataSource(tree)));
                var mockgrid = {
                    dataSource: ds,
                    getColumnForKey: function (key) {
                        return {
                            key: key,
                            type: 'text'
                        };
                    }
                };

                filtering.init(mockgrid, {});

                function test(settings, expectedIds, name) {
                    mockgrid.filtering.filter(settings);
                    return Promise.resolve(ds.getData()).then(function (data) {
                        assert.deepEqual(
                            data.map(function (r) {
                                return r.id;
                            }),
                            expectedIds,
                            name
                        );
                    });
                }

                return Promise.resolve(ds.expandToLevel(3)).then(function () {
                    return test(null, [1, 2, 21, 3, 31, 4, 5, 51, 52, 6, 61, 7, 8], "no filter");
                }).then(function () {
                    return test({
                        d: {
                            type: "exclusive",
                            method: "contains",
                            value: "IRAC"
                        }
                    }, [1, 3, 31, 4, 7, 8], "exclusive IRAC");
                }).then(function () {
                    return test({
                        e: {
                            type: "inclusive",
                            method: "contains",
                            value: "F"
                        }
                    }, [1, 2, 21, 3, 31, 4, 5, 51, 52, 6, 61], "inclusive F");
                }).then(function () {
                    return test({
                        d: {
                            type: "exclusive",
                            method: "contains",
                            value: "IRAC"
                        },
                        e: {
                            type: "inclusive",
                            method: "contains",
                            value: "F"
                        }
                    }, [1, 3, 31], "inclusive F exclusive IRAC");
                }).then(function () {
                    test({
                        e: {
                            type: "inclusive",
                            method: "contains",
                            value: "F"
                        },
                        d: {
                            type: "exclusive",
                            method: "contains",
                            value: "IRAC"
                        }
                    }, [1, 3, 31], "inclusive F exclusive IRAC reverse order");
                });
            });

            QUnit.test("Treegrid filtering with inclusive and exclusive", function (assert) {

                var tree = [
                    {
                        id: 1, d: "Cruft foods", e: "B", children: [
                        {id: 2, d: "IRAC7055i", e: "F"},
                        {id: 3, d: "ImagePRESS", e: "F"}
                    ]
                    },

                    {
                        id: 4, d: "Nettles", e: "B", children: [
                        {id: 5, d: "IRAC7055i", e: "F"},
                        {id: 6, d: "IRAC7055i", e: "F"}
                    ]
                    },

                    {
                        id: 7, d: "Swish Hair", e: "C", children: [
                        {id: 8, d: "ImagePRESS", e: "A"}
                    ]
                    }
                ];

                var ds = new SyncTreeGridDataSource(new DefaultTreeSource(new ArrayDataSource(tree)));
                var mockgrid = {
                    dataSource: ds,
                    getColumnForKey: function (key) {
                        return {
                            key: key,
                            type: 'text'
                        };
                    }
                };

                filtering.init(mockgrid, {});

                function test(settings, expectedIds, name) {
                    mockgrid.filtering.filter(settings);
                    return Promise.resolve(ds.getData()).then(function (data) {
                        assert.deepEqual(
                            data.map(function (r) {
                                return r.id;
                            }),
                            expectedIds,
                            name
                        )
                    });
                }

                return Promise.resolve(ds.expandToLevel(3)).then(function () {
                    return test({
                        d: {
                            type: "exclusive",
                            method: "contains",
                            value: "IRAC"
                        }
                    }, [1, 3, 4, 7, 8], "exclusive IRAC");
                }).then(function () {
                    return test({
                        e: {
                            type: "inclusive",
                            method: "contains",
                            value: "F"
                        }
                    }, [1, 2, 3, 4, 5, 6], "inclusive F");

                }).then(function () {
                    return test({
                        d: {
                            type: "exclusive",
                            method: "contains",
                            value: "IRAC"
                        },
                        e: {
                            type: "inclusive",
                            method: "contains",
                            value: "F"
                        }
                    }, [1, 3], "inclusive F exclusive IRAC");

                }).then(function () {
                    return test({
                        e: {
                            type: "inclusive",
                            method: "contains",
                            value: "F"
                        },
                        d: {
                            type: "exclusive",
                            method: "contains",
                            value: "IRAC"
                        }
                    }, [1, 3], "inclusive F exclusive IRAC reverse order");
                });
            });

            QUnit.test("Test data change event handling", function(assert) {
                var arrayDataSource = new ArrayDataSource([]);
                var filteringDataSource = new FilteringDataSource(arrayDataSource);

                const row1 = {id: 0,name: 'AABB'};
                const row2 = {id: 1,name: 'BBBB'};
                const row3 = {id: 3,name: 'AAAA'};
                const row4 = {id: 4,name: 'BBAA'};
                const row5 = {id: 5,name: 'BBCC'};
                const row6 = {id: 6,name: 'CCCC'};
                const row7 = {id: 7,name: 'DDBB'};
                const row8 = {id: 8,name: 'DDDD'};

                function expectEvent(event, description, after) {
                    return new Promise(function(resolve, reject) {
                        let timeout = setTimeout(function() {
                            reject(description);
                        }, 100);
                        filteringDataSource.one(event, function(event) {
                            clearTimeout(timeout);
                            assert.ok(true, description);
                            resolve(event);
                        });

                        after && after();
                    });
                }

                function expectNoEvent(events, description, after) {
                    return new Promise(function(resolve, reject) {
                        var eventSubscriptions;
                        var timeout = setTimeout(function() {
                            eventSubscriptions.forEach(function(sub) {
                                sub.cancel();
                            });
                            resolve();
                        }, 100);
                        eventSubscriptions = events.map(function(eventName) {
                            return filteringDataSource.on(eventName, function(evt) {
                                clearTimeout(timeout);
                                reject("Unexpected event " + eventName + " in " + description);
                            });
                        });

                        after && after();
                    });
                }

                function filter(str) {
                    filteringDataSource.applyFilter(null, function(row) {
                        return str == null || row.name.indexOf(str) > -1;
                    });
                }

                return expectEvent('rowsadded', 'No filtering, two rows added', function() {
                    arrayDataSource.insert(0, [
                        row1,
                        row2
                    ])
                }).then(function event(event) {
                    assert.deepEqual(event, {
                        start: 0, end: 2
                    }, 'No filtering, two rows added, event contents');

                    assert.deepEqual(filteringDataSource.getData(), [row1, row2], 'No filtering, two rows added, datasource contents');
                    assert.deepEqual(filteringDataSource.indexMap, [0,1]);

                    return expectNoEvent(['rowsadded','datachanged','rowsremoved'], 'Apply filter, no changes expected', function() {
                        filter('BB');
                    });
                }).then(function () {
                    assert.deepEqual(filteringDataSource.getData(), [row1, row2], 'Filtering, no changes expected');
                    assert.deepEqual(filteringDataSource.indexMap, [0,1]);

                    return expectEvent('rowsadded', 'Adding 4 rows, two match filter', function () {
                        arrayDataSource.insert(1, [
                            row3, row4, row5, row6
                        ]);
                    });
                }).then(function(event) {
                    assert.deepEqual(event, {start: 1, end: 3}, 'Two new rows in filtered datasource');
                    assert.deepEqual(arrayDataSource.getData(), [row1,row3,row4,row5,row6,row2]);
                    assert.deepEqual(filteringDataSource.getData(), [row1,row4,row5,row2]);
                    assert.deepEqual(filteringDataSource.indexMap, [0,2,3,5]);
                    return expectNoEvent(['rowsadded','rowsremoved'], 'Removing row that wasn\'t in filtered result, expecting no event', function() {
                        arrayDataSource.remove(1, 2);
                    });
                }).then(function() {
                    assert.deepEqual(arrayDataSource.getData(), [row1, row4, row5, row6, row2]);
                    assert.deepEqual(filteringDataSource.getData(), [row1, row4, row5, row2]);
                    assert.deepEqual(filteringDataSource.indexMap, [0, 1, 2, 4]);

                    return expectEvent('rowsadded', 'Adding two rows of which one is in filtered result, at end of list', function () {
                        arrayDataSource.insert(5, [row7, row8]);
                    });
                }).then(function(event) {
                    assert.deepEqual(event, {start: 4, end: 5});

                    assert.deepEqual(arrayDataSource.getData(), [row1, row4, row5, row6, row2, row7, row8]);
                    assert.deepEqual(filteringDataSource.getData(), [row1, row4, row5, row2, row7]);
                    assert.deepEqual(filteringDataSource.indexMap, [0, 1, 2, 4, 5]);

                    return expectEvent('rowsremoved','Removing two rows of which one is in filtered result, expecting 1 rowsremoved', function() {
                        arrayDataSource.remove(5, 7);
                    });
               }).then(function(event) {
                    assert.deepEqual({start: 4, end: 5}, event);
                    assert.deepEqual(arrayDataSource.getData(), [row1, row4, row5, row6, row2]);
                    assert.deepEqual(filteringDataSource.getData(), [row1, row4, row5, row2]);
                    assert.deepEqual(filteringDataSource.indexMap, [0, 1, 2, 4]);
                });
            });
        };
    }
);
