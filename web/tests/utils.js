import utils from "../utils.js";

describe("utils", function () {
    it("getValue", function () {
        var mock = {
            a: "A",
            b: ['x', 'y', 0],
            c: {
                d: 9,
                e: [1, 2, 3]
            }
        };

        expect(utils.getValue(mock, 'a')).toEqual("A")
        expect(utils.getValue(mock, 'b[0]')).toEqual("x")
        expect(utils.getValue(mock, 'b[2]')).toEqual(0)
        expect(utils.getValue(mock, 'c.d')).toEqual(9)
        expect(utils.getValue(mock, 'c.e[0]')).toEqual(1)
    });

    it("getValue with Array", function () {
        var mock = [0, "test", {"a": "bla"}];

        expect(utils.getValue(mock, 0)).toEqual(0)
        expect(utils.getValue(mock, 1)).toEqual("test")
        expect(utils.getValue(mock, "2.a")).toEqual("bla")
    });

    it("setValue", function () {
        var mock = {
            a: "A",
            b: ['x', 'y', 0],
            c: {
                d: 9,
                e: [1, 2, 3]
            }
        };

        utils.setValue(mock, 'a', 'AA');
        utils.setValue(mock, 'b[0]', 'xx');
        utils.setValue(mock, 'b[2]', '00');
        utils.setValue(mock, 'c.d', 'xyy');
        utils.setValue(mock, 'c.e[0]', 'fff');

        expect(mock).toEqual({
            a: "AA",
            b: ['xx', 'y', '00'],
            c: {
                d: 'xyy',
                e: ['fff', 2, 3]
            }
        });
    });

    it("setValue with array", function () {
        var mock = [0, "test", {"a": "bla"}];

        utils.setValue(mock, 0, 1);

        expect(mock).toEqual([1, "test", {"a": "bla"}]);
    });

    it("findRanges", function () {
        expect(utils.findRanges([0, 1, 2, 3, 5, 6, 8, 12])).toEqual([{
            start: 0,
            count: 4
        }, {start: 5, count: 2}, {start: 8, count: 1}, {start: 12, count: 1}]);
        expect(utils.findRanges([3, 1, 8, 2, 6, 0, 12, 5])).toEqual([{
            start: 0,
            count: 4
        }, {start: 5, count: 2}, {start: 8, count: 1}, {start: 12, count: 1}]);
    });

    it("overlap", function () {
        function testOverlap(a, b) {
            expect(utils.overlap(a, b)).toBeTrue();
            expect(utils.overlap(b, a)).toBeTrue();
        }

        function testNoOverlap(a, b) {
            expect(utils.overlap(a, b)).toBeFalse();
            expect(utils.overlap(b, a)).toBeFalse();
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

    it("debounce", function (done) {
        var cntr = 0;
        var arg = -1;
        var dbc = utils.debounce(function (ar) {
            arg = ar;
            cntr++;
        }, 100);
        setTimeout(function () {
            dbc(0);
        }, 10);
        setTimeout(function () {
            expect(cntr === 0).toBeTrue();
            expect(arg).toEqual(-1)
        }, 11);
        setTimeout(function () {
            dbc(1);
        }, 20);
        setTimeout(function () {
            expect(cntr === 0).toBeTrue();
            expect(arg).toEqual(-1)
        }, 21);
        setTimeout(function () {
            dbc(2);
        }, 30);
        setTimeout(function () {
            expect(cntr === 0).toBeTrue();
            expect(arg).toEqual(-1)
        }, 31);
        setTimeout(function () {
            dbc(3);
        }, 40);
        setTimeout(function () {
            expect(cntr === 0).toBeTrue();
            expect(arg).toEqual(-1)
        }, 41);
        setTimeout(function () {
            dbc(4);
        }, 110);
        setTimeout(function () {
            expect(cntr === 1).toBeTrue();
            expect(arg).toEqual(4)
        }, 220);
        setTimeout(function () {
            dbc(5);
        }, 230);
        setTimeout(function () {
            expect(cntr === 1).toBeTrue();
            expect(arg).toEqual(4)
        }, 220);
        setTimeout(function () {
            dbc(6);
        }, 240);
        setTimeout(function () {
            expect(cntr === 1).toBeTrue();
            expect(arg).toEqual(4)
        }, 220);
        setTimeout(function () {
            expect(cntr === 2).toBeTrue();
            expect(arg).toEqual(6)
            done();
        }, 350);
    });
});
