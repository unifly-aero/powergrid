export default function (opts) {
    if(opts.filteredRecordCount !== undefined) {
        return `Filter matches ${opts.filteredRecordCount} of ${opts.actualRecordCount} records`;
    }
    return `${opts.actualRecordCount} records`;
};
