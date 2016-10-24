define(['../override', '../jquery', '../utils'], function(override, $, utils) {
    
    "use strict";
    
    return function(grid, pluginOptions) {
        override(grid, function($super) {
            var editedRowIndexes = [];

            return {
                renderCell: function(record, column, rowIndex, columnIndex) {
                    var cell = $super.renderCell.apply(this, arguments);

                    var editable = this.editing.isEditable(record, column);
                    if(editable) {
                        cell.classList.add("pg-editable");
                    }
                    
                    return cell;
                },
                
                rowHeight: function(start, end) {
                    if(pluginOptions.additionalRowHeight !== undefined) {
                        if(end !== undefined) {
                            var editedRowCountInWindow = Object.keys(editedRowIndexes).filter(i => start <= parseInt(i) && parseInt(i) < end).length;
                            return $super.rowHeight(start, end) + editedRowCountInWindow * pluginOptions.additionalRowHeight;
                        } else {
                            return $super.rowHeight(start) + (editedRowIndexes[start] ? pluginOptions.additionalRowHeight : 0);
                        }
                    } else {
                        return $super.rowHeight(start, end);
                    }
                },

                init: function() {
                    var grid = this;
                    
                    $super.init();

                    if(pluginOptions.editOnClick !== false) {
                        this.container.on("click", ".pg-cell.pg-editable:not(.pg-editing)", function (event) {
                            var targetCell = event.target;
                            while(targetCell && !$(targetCell).is('.pg-cell')) {
                                targetCell = targetCell.parentNode;
                            }

                            var key = $(targetCell).attr('data-column-key');
                            var rowId = $(targetCell).parents(".pg-row:eq(0)").data('row-id');
                            var rowIdx = $(targetCell).parents(".pg-row:eq(0)").data('row-idx');
                            var record = grid.dataSource.getRecordById(rowId);

                            grid.editing.startEdit(targetCell, key, record, rowIdx);
                        });
                    }

                    if(pluginOptions.mode == 'row') {
                        this.container.on("click", "[role='pg-edit-row']", function(event) {
                            var rowId = $(event.target).parents(".pg-row:eq(0)").data('row-id');
                            var rowIdx = $(event.target).parents(".pg-row:eq(0)").data('row-idx');
                            var record = grid.dataSource.getRecordById(rowId);

                            grid.editing.startRowEdit(record, rowIdx);
                        });
                    }

                    $(this.dataSource).on('editabilitychanged', function(event, attr) {
                        grid.editing.updateEditability(attr.values);
                    });
                },
                
                editing: {
                    grid: grid,
                    editors: {},

                    addEditor: function(column, editor) {
                        this.editors[column.key] = editor;
                    },
                    
                    isEditable: function(record, column) {
                        var editable = column.editable;
                        if(editable && typeof pluginOptions.isEditable === 'function') {
                            editable = pluginOptions.isEditable.apply(grid, [record, column]);
                        }
                        return editable;
                    },

                    startRowEdit: function(record, rowIdx) {
                        var columns = grid.getVisibleColumns(),
                            rowParts = grid.getRowPartsForIndex(rowIdx);

                        for(var x=0,l=columns.length; x < l; x++) {
                            var column = columns[x];
                            if(this.isEditable(record, column)) {
                                var cell = rowParts.find(".pg-cell[data-column-key='" + column.key + "']");
                                this.startEdit(cell, column.key, record, rowIdx);
                            }
                        }

                        if(pluginOptions.additionalRowHeight !== undefined) {
                            grid.updateRowHeight(rowIdx);
                        }
                    },

                    startEdit: function(target, key, record, rowIdx) {
                        var column = grid.getColumnForKey(key);
                        var oldValue = utils.getValue(record, key);
                        var editor = this.createEditor(record, column, oldValue);
                        var editing = this;
                        
                        grid.scrollToCell(rowIdx, key);
                        
                        if($(target).is('.pg-editing')) return;
                        
                        if(!this.isEditable(record, column)) return;
                        
                        var opts = {
                            cell: target,
                            key: key,
                            record: record,
                            rowIdx: rowIdx,
                            column: column
                        };
                        
                        var beforeEditEvent = new $.Event('beforeedit', opts);
                        grid.trigger(beforeEditEvent);
                        
                        if(beforeEditEvent.isDefaultPrevented()) {
                            return;
                        }
                        
                        $(editor).on('commit', function(event, value, move) {
                            utils.inAnimationFrame(function() {
                                editing.commit(target, record, rowIdx, column, value, oldValue, move);
                            });
                        }).on('abort', function(event) {
                            utils.inAnimationFrame(function() {
                                editing.abort(target, record, rowIdx, column, oldValue);
                            });
                        });
                        $(target).addClass('pg-editing').empty().append(editor);

                        editedRowIndexes[rowIdx] = true;
                    },
                    
                    commit: function(target, record, rowIdx, column, value, oldValue, move) {
                        try {
                            grid.dataSource.setValue(record.id, column.key, value);
                        } catch(e) {
                            console.error("Exception while committing value", record, column, value, e);
                        }
                        this.endEdit(target, record, rowIdx, column, grid.dataSource.getRecordById(record.id)[column.key]);

                        var nextRowIdx = rowIdx, nextColumn = column, nextRecord = record;

                        if(move) {
                            switch(move) {
                                case 1:
                                case -1:
                                    do {
                                        nextRowIdx += move;
                                        nextRecord = grid.dataSource.getData(nextRowIdx, nextRowIdx+1)[0];
                                    } while(nextRecord && !this.isEditable(nextRecord, nextColumn));
                                    break;
                                case 2:
                                case -2:
                                    var i = grid.getColumnIndexForKey(column.key);
                                    do {
                                        i += move / 2;
                                        if(i >= grid.columnCount() || i < 0) {
                                            nextRowIdx += move / 2;
                                            nextRecord = grid.dataSource.getData(nextRowIdx, nextRowIdx+1)[0];
                                            i = move < 0 ? grid.columnCount() - 1 : 0;
                                        }
                                        nextColumn = grid.getColumnForIndex(i);
                                    } while(nextRecord && !this.isEditable(nextRecord, nextColumn));
                                    break;
                            }

                            if(nextRecord) {
                                var targetCell = grid.getCellFor(nextRecord.id, nextColumn.key);

                                this.startEdit(targetCell, nextColumn.key, nextRecord, nextRowIdx);
                            }
                        }
                    },
                    
                    abort: function(target, record, rowIdx, column, oldValue) {
                        this.endEdit(target, record, rowIdx, column, oldValue);
                    },
                    
                    endEdit: function(target, record, rowIdx, column, value) {
                        $(target).removeClass('pg-editing');
                        grid.updateCellValue(record.id, column.key);

                        delete editedRowIndexes[rowIdx];

                        if(pluginOptions.additionalRowHeight !== undefined) {
                            grid.updateRowHeight(rowIdx);
                        }
                    },

                    createEditor: function(record, column, value) {
                        var editor;
                        if (pluginOptions.editors && pluginOptions.editors[column.type]) {
                            editor = $(pluginOptions.editors[column.type](record, column, value));
                        } else if(column.editor) {
                            editor = $(column.editor(record, column, value));
                        } else {
                            editor = $("<input>").attr("type", column.type).val(value);
                        }
                        var grid = this, hasChanged = false;
                        editor.on("keydown", function(event) {
                            switch(event.keyCode) {
                            case 13:
                                event.preventDefault();
                                $(this).trigger('commit', [editor.val(), event.shiftKey ? -1 : 1]); break;
                            case 27:
                                event.preventDefault();
                                $(this).trigger('abort'); break;
                            case 9:
                                event.preventDefault();
                                $(this).trigger('commit', [editor.val(), event.shiftKey ? -2 : 2]); break;
                            }
                        });

                        editor.on("blur", function(event) {
                            if(pluginOptions.commitOnBlur !== false && hasChanged) {
                                $(this).trigger('commit', [editor.val()]);
                            } else if(pluginOptions.abortOnBlur === true || (pluginOptions.commitOnBlur !== false && !hasChanged)) {
                                $(this).trigger('abort');
                            }
                        }).on("change", function(event) {
                            hasChanged = true;
                        });

                        if (editor[0].select) {
                            setTimeout(editor[0].select.bind(editor[0]), 10);
                        } else if (editor[0].focus) {
                            setTimeout(editor[0].focus.bind(editor[0]), 10);
                        }
                        return editor;
                    },
                    
                    updateEditability: function(cells) {
                        for(var x=0,l=cells.length;x<l;x++) {
                            var cell = cells[x],
                                column = grid.getColumnForKey(cell.key),
                                row = grid.getRecordById(cell.id),
                                cellElement = column && row && grid.getCellFor(cell.id, cell.key);
                            if(cellElement) {
                                this.updateCellEditability(row, column, cellElement);
                            }
                        }
                    },
                    
                    updateCellEditability: function(row, column, cellElement) {
                        $(cellElement).toggleClass("pg-editable", this.isEditable(row, column));
                    }
                }
            }
        });
    };
    
});
