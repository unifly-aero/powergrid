export default function (object, override) {
    var $super = {};
    for (let x of [...Object.getOwnPropertyNames(object), ...Object.getOwnPropertyNames(object.constructor.prototype)]) {
        if (typeof object[x] === 'function') {
            $super[x] = object[x].bind(object);
        }
    }

    const overrides = override.apply(object, [$super, object]);

    for (let x in overrides) {
        object[x] = overrides[x];
    }

    return object;
}
