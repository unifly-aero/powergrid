/**
 * A hierarchical data source, for use with {@link TreeGrid}. As the PowerGrid component itself doesn't understand
 * the concept of data hierachy, TreeSources must be wrapped in a {@link AsyncTreeGridDataSource} or
 * {@link SyncTreeGridDataSource}.
 * See {@link BufferedAsyncTreeSource} for an abstract implementation that takes care of caching.
 * @interface TreeSource
 */

/**
 * Indicates that the datasource has become ready to accept queries.
 *
 * @event TreeSource#ready
 */

/**
 * Indicates that data has been loaded. In essence, this triggers a complete grid refresh.
 *
 * @event TreeSource#dataloaded
 */

/**
 * Indicates that the tree source is ready to be queried
 * @function TreeSource#isReady
 * @returns {boolean}
 */

/**
 * Returns the total number of rows in the tree, across all branches. This is optional.
 * @function TreeSource#getRecordCount
 * @returns {Promise<number>|number}
 */

/**
 * Returns the top-level nodes in the tree source.
 * @function TreeSource#getRootNodes
 * @param {number} start?
 * @param {number} end?
 * @returns {Promise<object[]>|object[]}
 */

/**
 * Returns whether or not the given node has children.
 * @function TreeSource#hasChildren
 * @param {object} node
 * @returns {boolean}
 */

/**
 * Queries the child nodes for the given node.
 * @function TreeSource#children
 * @param {object} node
 * @param {number} start?
 * @param {number} end?
 * @returns {Promise<object[]>|object[]}
 */

/**
 * Returns the number of children in the given node
 * @function TreeSource#countChildren
 * @param {object} node
 * @returns {Promise<number>|number}
 */

/**
 * Returns the number of root nodes.
 * @function TreeSource#countRootNodes
 * @returns {Promise<number>|number}
 */

/**
 * Applies the filter and triggers events for any changes as a result of the filter. Keep in mind that if a child matches the
 * filter, its ancestors should match the filter also in order to be shown in the results. Implementation of this function
 * is optional, and only required if {@link Filtering} is enabled on the grid.
 * @function TreeSource#filter
 * @param {object} settings
 * @param {function} predicate
 */

/**
 * Applies sorting to the dataset and triggers events for any changes that result from the sorting. Implementation of this
 * function is optional, and only required if {@link Sorting} is enabled on the grid.
 * @function TreeSource#sort
 * @param {function} comparator
 * @param {object} settings
 *
 */

/**
 * Gets a specific record by its id. This may not return a Promise. It can only be invoked for records that have previously
 * been fetched using {@link TreeSource.getRootNodes} or {@link TreeSource.children} so this can be fetched from a cache.
 * See {@link BufferedAsyncTreeSource} for a default caching implementation.
 * @function TreeSource#getRecordById
 * @param {string|number} id
 */
