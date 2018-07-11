define([], function() {
    return '<span class="pg-grouping-groupindicator"><span class="pg-group-column">{{:~column.title}}</span> {{:description}} <span class="pg-group-recordcount">{{if allChildrenCount}}{{:allChildrenCount}}{{else}}{{:recordCount}}{{/if}}</span></span>'
});
