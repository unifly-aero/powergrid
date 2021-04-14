import SyncTreeGridDataSource from "../datasources/synctreegriddatasource.js";
import filtering from "../extensions/filtering.js";
import ArrayDataSource from "../datasources/arraydatasource.js";
import DefaultTreeSource from "../datasources/defaulttreesource.js";
import FilteringDataSource from "../datasources/filteringdatasource.js";

const assert = {}


describe("Filtering", function() {
            it("3 deep treegrid filtering with inclusive and exclusive", function () {
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
                    },
                    trigger: function() {}
                };

                filtering.init(mockgrid, {});

                function test(settings, expectedIds, name) {
                    mockgrid.filtering.filter(settings);
                    return Promise.resolve(ds.getData()).then(function (data) {
                        expect(
                            data.map(function (r) {
                                return r.id;
                            })).toEqual(expectedIds);
                    });
                }

                return Promise.resolve(ds.expandToLevel(3)).then(function () {
                    return test(null, [1, 2, 21, 3, 31, 4, 5, 51, 52, 6, 61, 7, 8], "no filter");
                })
                    .then(function () {
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

            it("Treegrid filtering with inclusive and exclusive", function () {

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
                    },
                    trigger: function() {}
                };

                filtering.init(mockgrid, {});

                function test(settings, expectedIds, name) {
                    mockgrid.filtering.filter(settings);
                    return Promise.resolve(ds.getData()).then(function (data) {
                        expect(
                            data.map(function (r) {
                                return r.id;
                            })).toEqual(
                            expectedIds)
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

            it("Test data change event handling", function() {
                var arrayDataSource = new ArrayDataSource([]);
                var filteringDataSource = new FilteringDataSource(arrayDataSource);

                var row1 = {id: 0,name: 'AABB'};
                var row2 = {id: 1,name: 'BBBB'};
                var row3 = {id: 3,name: 'AAAA'};
                var row4 = {id: 4,name: 'BBAA'};
                var row5 = {id: 5,name: 'BBCC'};
                var row6 = {id: 6,name: 'CCCC'};
                var row7 = {id: 7,name: 'DDBB'};
                var row8 = {id: 8,name: 'DDDD'};

                function expectEvent(event, description, after) {
                    return new Promise(function(resolve, reject) {
                        var timeout = setTimeout(function() {
                            reject(description);
                        }, 100);
                        filteringDataSource.one(event, function(event) {
                            clearTimeout(timeout);
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
                    expect(event).toEqual({
                        start: 0, end: 2
                    });

                    expect(filteringDataSource.getData()).toEqual([row1, row2]);
                    expect(filteringDataSource.getData()).toHaveSize(2);

                    return expectNoEvent(['rowsadded','datachanged','rowsremoved'], 'Apply filter, no changes expected', function() {
                        filter('BB');
                    });
                }).then(function () {
                    expect(filteringDataSource.getData()).toEqual([row1, row2]);
                    expect(filteringDataSource.getData()).toHaveSize(2);

                    return expectEvent('rowsadded', 'Adding 4 rows, two match filter', function () {
                        arrayDataSource.insert(1, [
                            row3, row4, row5, row6
                        ]);
                    });
                }).then(function(event) {
                    expect(event).toEqual({start: 1, end: 3});
                    expect(arrayDataSource.getData()).toEqual([row1, row3, row4, row5, row6, row2]);
                    expect(filteringDataSource.getData()).toEqual([row1, row4, row5, row2]);
                    expect(filteringDataSource.getData()).toHaveSize(4);
                    return expectNoEvent(['rowsadded','rowsremoved'], 'Removing row that wasn\'t in filtered result, expecting no event', function() {
                        arrayDataSource.remove(1, 2);
                    });
                }).then(function() {
                    expect(arrayDataSource.getData()).toEqual([row1, row4, row5, row6, row2]);
                    expect(filteringDataSource.getData()).toEqual([row1, row4, row5, row2]);

                    return expectEvent('rowsadded', 'Adding two rows of which one is in filtered result, at end of list', function () {
                        arrayDataSource.insert(5, [row7, row8]);
                    });
                }).then(function(event) {
                    expect(event).toEqual({start: 4, end: 5});

                    expect(arrayDataSource.getData()).toEqual([row1, row4, row5, row6, row2, row7, row8]);
                    expect(filteringDataSource.getData()).toEqual([row1, row4, row5, row2, row7]);
                    expect(filteringDataSource.getData()).toHaveSize(5);

                    return expectEvent('rowsremoved','Removing two rows of which one is in filtered result, expecting 1 rowsremoved', function() {
                        arrayDataSource.remove(5, 7);
                    });
               }).then(function(event) {
                    expect({start: 4, end: 5}).toEqual(event);
                    expect(arrayDataSource.getData()).toEqual([row1, row4, row5, row6, row2]);
                    expect(filteringDataSource.getData()).toEqual([row1, row4, row5, row2]);
                    expect(filteringDataSource.getData()).toHaveSize(4);;
                });
            });

            it("Test filter changing", function() {
                var row1 = {id: 0,name: 'AABB'};
                var row2 = {id: 1,name: 'BBBB'};
                var row3 = {id: 3,name: 'AAAA'};
                var row4 = {id: 4,name: 'BBAA'};
                var row5 = {id: 5,name: 'BBCC'};
                var row6 = {id: 6,name: 'CCCC'};
                var row7 = {id: 7,name: 'DDBB'};
                var row8 = {id: 8,name: 'DDDD'};

                var arrayDataSource = new ArrayDataSource([
                    row1,
                    row2,
                    row3,
                    row4,
                    row5,
                    row6,
                    row7,
                    row8
                ]);

                var filteringDataSource = new FilteringDataSource(arrayDataSource);

                function expectEvents(event, count, description, after) {
                    return new Promise(function (resolve, reject) {
                        var events = new Array(count);
                        var c = 0;
                        var subsc = filteringDataSource.on(event, function (event) {
                            events[c++] = event;
                        });
                        var timeout = setTimeout(function () {
                            subsc.cancel();
                            expect(c).toEqual(count);
                            resolve(events);
                        }, 100);

                        after && after();
                    });
                }

                expect(filteringDataSource.getData()).toEqual([
                    row1,
                    row2,
                    row3,
                    row4,
                    row5,
                    row6,
                    row7,
                    row8
                ]);

                return expectEvents("rowsremoved", 3, "Expecting three rows removed", function() {
                    filteringDataSource.applyFilter(null, function(x) { return x.name.indexOf('BB') > -1; });
                }).then(function(events) {
                    expect(events).toEqual([
                        {start: 7, end: 8},
                        {start: 5, end: 6},
                        {start: 2, end: 3}
                    ]);
                    expect(filteringDataSource.getData()).toEqual([
                        row1,
                        row2,
                        row4,
                        row5,
                        row7
                    ]);

                    return expectEvents("rowsadded", 3, "Expecting three rows added", function() {
                        filteringDataSource.applyFilter(null, null);
                    }).then(function(events) {
                        expect(events).toEqual([
                            {start: 2, end: 3},
                            {start: 5, end: 6},
                            {start: 7, end: 8}
                        ]);
                        expect(filteringDataSource.getData()).toEqual([
                            row1,
                            row2,
                            row3,
                            row4,
                            row5,
                            row6,
                            row7,
                            row8
                        ]);
                    })
                });
            });


})
