export class Evented {
    trigger(event: string, ...args: any): void;
    on(event: string, callback: (event: string, ...args: any) => void);
}

export interface PowerGridColumnDefinition {
    [key: string]: any;
}

export interface PowerGridOptions {
    columns: PowerGridColumnDefinition[];
    dataSource?: DataSource<any>;
    treeSource?: TreeSource<any>;
    virtualScrollingExcess?: number; // The number of extra rows to render on each side (top/bottom) of the viewport. A higher value results in less flickering during scrolling, but also higher memory usage and longer rendering times.
    frozenRowsTop?: number; // Number of rows at the top of the grid that should not scroll (i.e. header)
    frozenRowsBottom?: number; // Number of rows at the bottom of the grid that should not scroll (i.e. footer)
    frozenColumnsLeft?: number; // Number of columns on the left side of the grid that should not scroll
    frozenColumnsRight?: number; // Number of columns on the right side of the grid that should not scroll
    fullWidth?: boolean; // If true, the last column will stretch to fill the remaining space
    rowHeight?: number; // Default height of each row in pixels. Can be overridden in extensions on a per row basis.
    extensions: object; // Object listing which extensions to load and their options
    settingsId?: string;
    autoResize?: boolean;
}

export class PowerGrid extends Evented {
    constructor(target: any, options: PowerGridOptions);
    then(callback: () => void): Promise<void>;
    destroy(): void;
    resetDataSubscriptions(): void;
    getRow(index: number): object;
    indexOfRow(row: object): number;
    getRecordCount(): number;
    getData(start?: number, end?: number): Promise<object[]>|object[];
    getDataSync(start?: number, end?: number): object[];
}

export interface DataSource<T> {

}

export interface TreeSource<T> {

}

export class ArrayDataSource<T> implements DataSource<T> {
    constructor(data: T[]);
    load(data?: T[]): void;
}

export class JsonDataSource implements DataSource<object> {

}

export interface GroupRow {

}

export class GroupingDataSource<T> implements DataSource<T | GroupRow> {

}

export class SortingDataSource<T> implements DataSource<T> {

}

export class FilteringDataSource<T> implements DataSource<T> {

}

export class AsyncTreeGridDataSource<T> implements DataSource<T | GroupRow> {
    constructor(treeSource: TreeSource<T>);
}

export class BufferedAsyncTreeSource<T> implements DataSource<T | GroupRow> {
    constructor(treeSource: TreeSource<T>)
}
