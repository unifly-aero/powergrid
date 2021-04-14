define(['./powergrid', './datasources/arraydatasource', './datasources/jsondatasource',
        './datasources/groupingdatasource', './datasources/sortingdatasource',
        './datasources/filteringdatasource', './datasources/asynctreegriddatasource',
        './datasources/bufferedasynctreesource', './utils'],
    function (PowerGrid, ArrayDataSource, JsonDataSource, GroupingDataSource, SortingDataSource, FilteringDataSource, AsyncTreeGridDataSource, BufferedAsyncTreeSource, utils) {
        return {
            PowerGrid: PowerGrid.default,
            ArrayDataSource: ArrayDataSource.default,
            JsonDataSource: JsonDataSource.default,
            GroupingDataSource: GroupingDataSource.default,
            SortingDataSource: SortingDataSource.default,
            FilteringDataSource: FilteringDataSource.default,
            AsyncTreeGridDataSource: AsyncTreeGridDataSource.default,
            BufferedAsyncTreeSource: BufferedAsyncTreeSource.default,
            Evented: utils.default.Evented,
            PowerGridUtilities: utils.default
        };
    });
