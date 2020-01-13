export class Evented<T extends {[eventname: string]: any}> {
    trigger<E extends keyof(T)>(event: keyof(T), ...args: T[E]): void;
    on<E extends keyof(T)>(event: E, callback: (event: keyof(T), ...args: T[E]) => void);
}

export interface RecordType {
    id: string|number
}

export type IdOf<T extends RecordType> = T["id"];

export interface PowerGridCellEditor {
    editor: HTMLElement,
    value(): any,
    on(eventName: string, handler: (eventName, data) => void);
}

export interface PowerGridExtensionOptions<T extends RecordType> {
    align?: boolean,
    autosizecolumn?: boolean,
    backdrop?: boolean,
    columnmoving?: boolean,
    columnsizing?: boolean | {
        minSize?: number
    },
    directinput?: boolean,
    dragging?: boolean | {
        allowDragOutsideOfViewPort?: boolean
    },
    dummy?: (override, $super) => any,
    editing?: boolean | {
        mode?: 'cell'|'row',
        editOnClick?: boolean,
        commitOnBlur?: boolean,
        abortOnBlur?: boolean,
        additionalRowHeight?: number,
        liveUpdate?: boolean,
        defaultEditor(record: T, column: PowerGridColumnDefinition<any>, value: any): PowerGridCellEditor,
        isEditable?(record: T, column: PowerGridColumnDefinition<any>): boolean,
        editors?: {
            [columnType: string]: PowerGridCellEditor
        }
    },
    editing_currency?: boolean,
    editing_date?: boolean,
    editing_number_int?: boolean,
    editing_option?: boolean,
    export_csv?: boolean | {
        autodownload?: boolean
    },
    filtering?: boolean | {
        defaultFilterSettings?: FilterSettings<T>,
        filters?: {[K in keyof T]: Filter<T[K]>}
    },
    filtering_option?: boolean,
    filtering_date?: boolean,
    filtering_scalar?: boolean,
    flexcolumns?: boolean,
    formatting?: boolean | {[k: string]: (value: any, record?: T, column?: PowerGridColumnDefinition<T>) => string},
    grouping?: {
        defaultGroupedColumns?: (keyof T)[],
        fixedGroupedColumns?: (keyof T)[],
        indicatorForFixedGroups?: boolean,
        grouper?: HTMLElement,
        hideGroupedColumns?: boolean,
        renderGroupRow?(column: PowerGridColumnDefinition<any>, record: T): Element | DocumentFragment
    },
    rowhighlighting?: boolean,
    selection?: boolean | {
        onrowselected?(id: IdOf<T>);
    },
    sorting?: boolean | {
        defaultSortedColumns?: Sorting<T>[]
    },
    statistics?: boolean | {
        template: string
    },
    styling?: {
        applyClasses(record: T, column: PowerGridColumnDefinition<any>, callback: (string)=>void)
    },
    subcells?: {
        cellpadding: number,
        cellheight: number
    },
    subgrids?: {
        hasSubGrid(grid: PowerGrid<T>, record: T): boolean,
        subGridSettings(record: T): Promise<PowerGridOptions<any>>,
        subgrid(id): PowerGrid<any>
    },
    subview?: {
        hasSubView?():boolean,
        prerender?: boolean,
        renderSubView(grid: PowerGrid<T>, record: T, target: HTMLElement): Promise<void>
    },
    summarize?: {
        summaryFactory(): RecordType
    },
    templating?: boolean,
    treegrid?: boolean | {
        autoTreeDataSource?: boolean,
        initialTreeDepth?: number
    },
    validation?: boolean,
    variablerowheight?: {
        variableRowHeight(row: T): number;
    }
}

export interface PowerGridColumnDefinition<V> {
    [key: string]: any;
}

export interface PowerGridOptions<T extends RecordType> {
    columns: PowerGridColumnDefinition<T>[];
    dataSource?: DataSource<T>;
    treeSource?: TreeSource<T>;
    virtualScrollingExcess?: number; // The number of extra rows to render on each side (top/bottom) of the viewport. A higher value results in less flickering during scrolling, but also higher memory usage and longer rendering times.
    frozenRowsTop?: number; // Number of rows at the top of the grid that should not scroll (i.e. header)
    frozenRowsBottom?: number; // Number of rows at the bottom of the grid that should not scroll (i.e. footer)
    frozenColumnsLeft?: number; // Number of columns on the left side of the grid that should not scroll
    frozenColumnsRight?: number; // Number of columns on the right side of the grid that should not scroll
    fullWidth?: boolean; // If true, the last column will stretch to fill the remaining space
    rowHeight?: number; // Default height of each row in pixels. Can be overridden in extensions on a per row basis.
    extensions: PowerGridExtensionOptions<T>; // Object listing which extensions to load and their options
    settingsId?: string;
    autoResize?: boolean;
    languageCode?: string;
}

export interface FilterSetting {
}

export interface TextFilterSetting extends FilterSetting {
    value: string,
    type: "inclusive"|"exclusive",
    method: "beginsWith"|"endsWith"|"contains"
}

export interface OptionFilterSetting extends FilterSetting {
    selectedOptions: any[]
}

export interface ScalarFilterSetting<T> extends FilterSetting {
    minimum: T,
    maximum: T,
    method: 'scalar',
    dataType: 'number'|'date'|'datetime'
}

export type FilterSettings<T> = {[key in keyof(T)]?: FilterSetting};

export type Comparator<T> = (a: T, b: T) => number;

export class PowerGrid<T extends RecordType> extends Evented<{
    inited: [PowerGrid<T>],
    change: [],
    dataloaded: [object[]],
    datachanged: [{values?: {id: any, key: string}[]}|{rows?: {id: any}[]}],
    datarendered: [],
    rowsremoved: [{start: number, end: number}],
    rowsadded: [{start: number, end: number}],
    viewchanged: [],
    scroll: [],
    startrowedit: [string|number],
    endrowedit: [string|number],
    columngrabstart: [{column: PowerGridColumnDefinition<any>}],
    columngrabend: [{column: PowerGridColumnDefinition<any>}],
    groupingchanged: [string[]],
    filterchange: [{settings: FilterSettings<T>}]
}> {
    constructor(target: any, options: PowerGridOptions<T>);
    then(callback: () => void): Promise<void>;
    destroy(): void;
    resetDataSubscriptions(): void;
    getRow(index: number): object;
    indexOfRow(row: object): number;
    getRecordCount(): number;
    getData(start?: number, end?: number): Promise<object[]>|object[];
    getDataSync(start?: number, end?: number): object[];
    trigger(event: string, ...args: any): void;
    hideColumns(keys: string[]);
    updateCellValue(rowId: any, key: string);
    options: Readonly<PowerGridOptions<T>>;

    filtering?: {
        filter(settings: {[key: string]: FilterSetting})
    };
    grouping?: {
        readonly groups: PowerGridColumnDefinition<any>[]
    };
    export?: {
        csv(filename: string): Promise<{stringValue: string, filename: string}>;
    }
}

export type DataSourceEvents<T extends RecordType> = {
    dataloaded: [],
    rowsadded: [{start: number, end: number}],
    rowsremoved: [{start: number, end: number}],
    datachanged: [{values: {id: IdOf<T>, key: keyof(T)}[]}|{rows: T[]}],
};

export interface DataSource<T extends RecordType> {
    assertReady(): void;
    recordCount(): Promise<number>|number,
    getRecordById(id: T['id']): T,
    getData(start?: number, end?: number): T[] | Promise<T[]>,
    isReady(): boolean,
    getRowByIndex?(idx: number): T,
    sort?(comparator: (a: T, b: T) => number): void
    setValue?<K extends keyof(T)>(rowId: IdOf<T>, key: K, value: T[K]);
    getValue?<K extends keyof(T)>(rowId: IdOf<T>, key: K): T[K];
    applyFilter?(settings: FilterSettings<T>, predicate: (row: T) => boolean);
    hasSubView?(record: T): boolean;
    buildStatistics?(): any;
}

export type TreeSourceEvents<T extends RecordType> = {
    dataloaded:[]
};

export interface TreeSource<T extends RecordType> {
    isReady(): boolean // returns true when the methods below are safe to be called
    getRecordCount(): (number|Promise<number>) // returns the total number of rows in the grid (optional)
    getRootNodes(start?: number, end?: number): (T[]|Promise<T[]>) // returns the root nodes within the start->end window if specified
    hasChildren(parent: T): boolean // returns whether the given node has children
    children(parent: T, start?: number, end?: number): (T[]|Promise<T[]>) // returns child nodes within the start->end window if specified
    countChildren(parent: T): (number|Promise<number>) // returns the number of children in the given node
    countRootNodes(): (number|Promise<number>); // returns the number of root nodes
    filter?(settings: FilterSettings<T>, predicate: (row: T) => boolean) // tells the treesource to apply the filter and trigger any data change events. Keep in mind that if a child matches the filter, its ancestors should match the filter also in order to be shown in the results. (optional, only required if filtering is enabled on the grid)
    sort?(comparator: Comparator<T>, settings: object) // tells the treesource to apply the sorting and trigger any data change events (optional, only required if sorting is enabled on the grid)
    getStatistics?(): object // return the grid statistics
    getRecordById?(id: IdOf<T>): T // return the record with the given id; this id will already have been known so retrieve from a cache (no Promise return value allowed here)
    setValue?<K extends keyof(T)>(rowId: IdOf<T>, key: K, value: T[K]);
    getValue?<K extends keyof(T)>(rowId: IdOf<T>, key: K): T[K];
}

export class ArrayDataSource<T extends RecordType> extends Evented<DataSourceEvents<T>> implements DataSource<T> {
    constructor(data: T[]);
    load(data?: T[]): void;
    recordCount(): number;
    getRowByIndex(idx: number): T;
    getRecordById(id: IdOf<T>): T;
    insert(idx: number, rows: T[]): void;
    remove(start: number, end: number): void;
    getData(start?: number, end?: number): T[];
    setValue<K extends keyof(T)>(rowId: IdOf<T>, key: K, value: T[K]);
    assertReady(): void;
    isReady(): boolean;
    sort(comparator: Comparator<T>): void;
    replace(record: T): void;
}

export class JsonDataSource<T extends RecordType> extends Evented<DataSourceEvents<T>> implements DataSource<T> {
    constructor(settings: {url: string});
    assertReady(): void;
    isReady(): boolean;
    load(): void;
    recordCount(): number;
    getData(start?: number, end?: number): T[];
    getRecordById(id: IdOf<T>): T;
    setValue<K extends keyof(T)>(rowId: IdOf<T>, key: K, value: T[K]);
}

export interface GroupRow extends RecordType {
}

export class GroupingDataSource<T extends RecordType, D extends DataSource<T>> extends Evented<TreeSourceEvents<T|GroupRow>> implements TreeSource<T|GroupRow> {
    constructor(delegate: D, options?: any);
    load(): void;
    getRecordCount: D["recordCount"];
    getRootNodes(start?: number, end?: number): (T|GroupRow)[];
    children(row: GroupRow, start?: number, end?: number): T[] | GroupRow[];
    countRootNodes(): number;
    countChildren(row: GroupRow): number;
    filter(settings: FilterSettings<T>, predicate: (row: T) => boolean): void;
    sort(comparator: Comparator<T>): void;
    updateView(): void;
    groupRecordCount(group: GroupRow): number; // fixme duplicate of countChildren
    getRecordById(id: (GroupRow | T)["id"]): GroupRow | T;
    recordCount(): number;
    isReady(): boolean;
    assertReady(): void;
    parent(row: T | GroupRow): GroupRow;
    hasChildren(row: T | GroupRow): boolean;
    processGroup(group: GroupRow): void;
    hasSubView(row: GroupRow | T): boolean;
    queryForExport(): T[];
}

export class SortingDataSource<T extends RecordType, D extends DataSource<T>> extends Evented<DataSourceEvents<T>> implements DataSource<T> {
    constructor(delegate: D);
    isReady(): boolean;
    reload(): void;
    recordCount(): number;
    getData(start?: number, end?: number): T[];
    getValue<K extends keyof T>(rowId: IdOf<T>, key: K): T[K];
    setValue<K extends keyof T>(rowId: IdOf<T>, key: K, value: T[K]);
    assertReady(): void;
    buildStatistics?: D["buildStatistics"];
    getRecordById: D["getRecordById"];
    sort(comparator: Comparator<T>): void;
}

export class FilteringDataSource<T extends RecordType, D extends DataSource<T>> extends Evented<DataSourceEvents<T>> implements DataSource<T> {
    isReady(): boolean;
    reload(): void;
    recordCount(): number;
    getData(start?: number, end?: number): T[];
    setValue: D["setValue"];
    assertReady(): void;
    buildStatistics(): {actualRecordCount: number};
    updateView(): void;
    applyFilter(settings: FilterSettings<T>, predicate: (row: T) => boolean);
    getRecordById(id: IdOf<T>): T;
}

export interface GroupingSettings {

}

export class AsyncTreeGridDataSource<T extends RecordType, D extends TreeSource<T>> extends Evented<DataSourceEvents<T> & {
    treetoggled: [{id: IdOf<T>, index: number, state: boolean}]
}> implements DataSource<T | GroupRow> {
    constructor(treeSource: D, options?: any);
    load(): void;
    isReady(): boolean;
    assertReady(): void;
    getData(start?: number, end?: number): Promise<(GroupRow | T)[]>;
    recordCount(): Promise<number>;
    toggle(id: IdOf<T>): void | Promise<void>;
    expand(row: T): Promise<void>;
    collapse(row: T): Promise<void>;
    isExpanded(row: T): boolean;
    getTreeLevel(row: T): number;
    expandAll(rowId?: IdOf<T>, depth?: number): Promise<void>;
    expandToLevel(depth): Promise<void>;
    collapseAll(rowId: IdOf<T>): void;
    hasChildren(row: T): boolean;
    children(row: T): Promise<T | GroupRow>;
    getRecordById(id: (GroupRow | T)["id"]): GroupRow | T;
    parent(row: T): GroupRow;
    sort(comparator: (a: (GroupRow | T), b: (GroupRow | T)) => number): void;
    group(settings: GroupingSettings): void;
    applyFilter(settings: FilterSettings<T>, predicate: (row: T) => boolean);
    setValue: D["setValue"];
}

export class BufferedAsyncTreeSource<T extends RecordType, D extends TreeSource<T>> implements TreeSource<T> {
    constructor(treeSource: D);
    reset(): void;
    isReady(): boolean;
    getRecordCount(): number | Promise<number>;
    getRootNodes(start?: number, end?: number): Promise<(T)[]>;
    hasChildren(parent: T): boolean;
    children(parent: T, start?: number, end?: number): Promise<T[]>;
    countChildren(parent: T): number | Promise<number>;
    countRootNodes(): number | Promise<number>;
    filter: D["filter"];
    sort: D["sort"];
    getStatistics: D["getStatistics"];
    getRecordById: D["getRecordById"];
}

export interface Filter<V> extends Evented<any> {
    filterBox?: DocumentFragment // the fragment containing the UI elements for the filter
    value: V // the value to filter on
    valueMatches: (value: V, columnSettings: any, column: PowerGridColumnDefinition<V>) => boolean // predicate for client-side filtering
}

export interface Sorting<T> {
    direction: 'descending'|'ascending',
    key: keyof T
}
