// /***
//  * Editing for currency fields
//  * Enabled when column is of type 'CURRENCY'
//  * Supports following column options:
//  *  - decimalSymbol
//  *  - groupSymbol
//  *  - currencyPrecision
//  */
// import override from "../override.js";
// import utils from "../utils.js";
//
// define(['../override', '../jquery', '../utils', 'w2ui'], function(override, $) {
//
//     "use strict";
//
//     return {
//         requires: {
//             editing: {
//                 editors: {
//                     currency: function(record, column, value) {
//                         var input = $("<input>").w2field('money', {
//                             autoFormat: true,
//                             currencyPrefix: '€',
//                             currencyPrecision: column.precision,
//                             precision: column.precision
//                         });
//                         input.value(value);
//                         return input;
//                     }
//                 }
//             }
//         }
//     };
// });
