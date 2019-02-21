define([], function () {
    return function (t) {
        return '<ul class="pg-menu"><li data-filter-method="contains" data-filter-type="inclusive">' + t('filter_pane.contains') + '</li><li data-filter-method="beginsWith" data-filter-type="inclusive">' + t('filter_pane.begins') + '</li><li data-filter-method="endsWith" data-filter-type="inclusive">' + t('filter_pane.ends') + '</li><li data-filter-method="contains" data-filter-type="exclusive">' + t('filter_pane.not_contains') + '</li><li data-filter-method="beginsWith" data-filter-type="exclusive">' + t('filter_pane.not_begins') + '</li><li data-filter-method="endsWith" data-filter-type="exclusive">' + t('filter_pane.not_ends') + '</li></ul>'
    }
});
