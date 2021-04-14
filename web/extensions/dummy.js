/**
 * Dummy extension. Allows easy overriding of PowerGrid functions from the grid settings.
 *
 * Usage:
 */
import override from "../override.js";

export default function (grid, pluginOptions) {
    override(grid, pluginOptions.bind(this, override));
}
