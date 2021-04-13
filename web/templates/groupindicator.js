import {createElement} from "../utils.js";

export default function (data) {
    return createElement("div",
        {
            class: "pg-group-indicator",
            "data-group-key": data.column.key
        },
        [
            data.removable && createElement("span", {
                class: "pg-group-delete",
                "data-group-key": data.column.key
            }),
            document.createTextNode(" "),
            createElement("span", {}, [document.createTextNode(data.column.title)])
        ])
}
