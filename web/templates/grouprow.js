import {createElement} from "../utils.js";

export default function (data) {
    return createElement("span", {
        class: "pg-grouping-groupindicator"
    }, [
        createElement("span", {
            class: "pg-group-column",
        }, [
            document.createTextNode(data.column.title)
        ]),
        document.createTextNode(data.value),
        createElement("span", {
            class: "pg-group-recordcount",
        }, [
            document.createTextNode(data.record.recordCount)
        ]),
    ]);
}
