/**
 * Enables aligning of cell contents.
 *
 * Usage:
 */
import override from "../override.js";

export default function (grid) {
    override(grid, function ($super) {
        return {
            renderCell: function renderCell(record, column, rowIdx, columnIdx) {
                var cell = $super.renderCell(record, column, rowIdx, columnIdx);
                if (column.align) {
                    cell.classList.add("pg-align-" + column.align);
                }
                return cell;
            }
        }
    });
}
