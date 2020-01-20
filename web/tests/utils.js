"use strict";
define(
    ['QUnit', '../utils'],
    function(QUnit, utils) {
        return function() {
            QUnit.test("getValue", function(assert) {
                var mock = {
                    a: "A",
                    b: ['x','y',0],
                    c: {
                        d: 9,
                        e: [1,2,3]
                    }
                };

                assert.equal(utils.getValue(mock, 'a') , "A", "simple getter");
                assert.equal(utils.getValue(mock, 'b[0]') , "x", "array index getter");
                assert.equal(utils.getValue(mock, 'b[2]') , 0, "array index getter with number");
                assert.equal(utils.getValue(mock, 'c.d') , 9, "nested getter");
                assert.equal(utils.getValue(mock, 'c.e[0]') , 1, "nested getter with array");
            });

            QUnit.test("getValue with Array", function(assert) {
                var mock = [0, "test", {"a": "bla"}];

                assert.equal(utils.getValue(mock, 0), 0, "simple getter");
                assert.equal(utils.getValue(mock, 1), "test", "another getter");
                assert.equal(utils.getValue(mock, "2.a"), "bla", "something nested");
            });

            QUnit.test("setValue", function(assert) {
                var mock = {
                    a: "A",
                    b: ['x','y',0],
                    c: {
                        d: 9,
                        e: [1,2,3]
                    }
                };

                utils.setValue(mock, 'a', 'AA');
                utils.setValue(mock, 'b[0]', 'xx');
                utils.setValue(mock, 'b[2]', '00');
                utils.setValue(mock, 'c.d', 'xyy');
                utils.setValue(mock, 'c.e[0]', 'fff');

                assert.deepEqual(mock, {
                    a: "AA",
                    b: ['xx','y','00'],
                    c: {
                        d: 'xyy',
                        e: ['fff',2,3]
                    }
                });
            });

            QUnit.test("setValue with array", function(assert) {
                var mock = [0, "test", {"a": "bla"}];

                utils.setValue(mock, 0, 1);

                assert.deepEqual(mock, [1, "test", {"a": "bla"}]);
            });

            QUnit.test("findRanges", function(assert) {
                assert.deepEqual(utils.findRanges([0,1,2,3,5,6,8,12]), [{start: 0, count: 4}, {start: 5, count: 2}, {start: 8, count: 1}, {start: 12, count: 1}], "find ranges");
                assert.deepEqual(utils.findRanges([3,1,8,2,6,0,12,5]), [{start: 0, count: 4}, {start: 5, count: 2}, {start: 8, count: 1}, {start: 12, count: 1}], "find ranges unsorted");
            });

            QUnit.test("overlap", function(assert) {
                function testOverlap(a,b) {
                    assert.ok(utils.overlap(a,b));
                    assert.ok(utils.overlap(b,a));
                }
                function testNoOverlap(a,b) {
                    assert.notOk(utils.overlap(a,b));
                    assert.notOk(utils.overlap(b,a));
                }
                testNoOverlap({begin: 0, end: 0}, {begin: 6, end: 8});
                testNoOverlap({begin: 0, end: 4}, {begin: 6, end: 8});
                testNoOverlap({begin: 2, end: 4}, {begin: 6, end: 8});
                testNoOverlap({begin: 2, end: 6}, {begin: 6, end: 8});

                testOverlap({begin: 2, end: 7}, {begin: 6, end: 8});
                testOverlap({begin: 2, end: 8}, {begin: 6, end: 8});
                testOverlap({begin: 2, end: 9}, {begin: 6, end: 8});

                testNoOverlap({begin: 6, end: 6}, {begin: 6, end: 8});

                testOverlap({begin: 6, end: 7}, {begin: 6, end: 8});
                testOverlap({begin: 6, end: 8}, {begin: 6, end: 8});
                testOverlap({begin: 6, end: 9}, {begin: 6, end: 8});

                testNoOverlap({begin: 7, end: 7}, {begin: 6, end: 8});

                testOverlap({begin: 7, end: 8}, {begin: 6, end: 8});
                testOverlap({begin: 7, end: 9}, {begin: 6, end: 8});

                testNoOverlap({begin: 8, end: 8}, {begin: 6, end: 8});
                testNoOverlap({begin: 8, end: 9}, {begin: 6, end: 8});

                testNoOverlap({begin: 9, end: 9}, {begin: 6, end: 8});
                testNoOverlap({begin: 9, end: 10}, {begin: 6, end: 8});
            });

            QUnit.test("debounce", function(assert) {
                var cntr = 0;
                var arg = -1;
                var done = assert.async();
                var dbc = utils.debounce(function(ar) {
                    arg = ar;
                    cntr++;
                }, 100);
                setTimeout(function() { dbc(0); }, 10);
                setTimeout(function() { assert.ok(cntr === 0); assert.equal(arg, -1); }, 11);
                setTimeout(function() { dbc(1); }, 20);
                setTimeout(function() { assert.ok(cntr === 0); assert.equal(arg, -1);}, 21);
                setTimeout(function() { dbc(2); }, 30);
                setTimeout(function() { assert.ok(cntr === 0); assert.equal(arg, -1);}, 31);
                setTimeout(function() { dbc(3); }, 40);
                setTimeout(function() { assert.ok(cntr === 0); assert.equal(arg, -1);}, 41);
                setTimeout(function() { dbc(4); }, 110);
                setTimeout(function() { assert.ok(cntr === 1); assert.equal(arg, 4);}, 220);
                setTimeout(function() { dbc(5); }, 230);
                setTimeout(function() { assert.ok(cntr === 1); assert.equal(arg, 4);}, 220);
                setTimeout(function() { dbc(6); }, 240);
                setTimeout(function() { assert.ok(cntr === 1); assert.equal(arg, 4);}, 220);
                setTimeout(function() { assert.ok(cntr === 2); assert.equal(arg, 6); done(); }, 350);
            });
        };
    }
);
