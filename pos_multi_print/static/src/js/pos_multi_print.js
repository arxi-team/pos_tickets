/** @odoo-module **/

// Simple test to see if module loads
console.log('*** MULTI-PRINT MODULE LOADING ***');

import { PosStore } from "@point_of_sale/app/store/pos_store";
import { patch } from "@web/core/utils/patch";

console.log('*** IMPORTS SUCCESSFUL ***');

patch(PosStore.prototype, "pos_multi_print.PosStore", {
    setup(...args) {
        this._super(...args);
        console.log('*** POS MULTI-PATCH APPLIED ***');
        console.log('*** MULTI-PRINT ENABLED:', this.config.enable_multi_print, '***');
    },
});

console.log('*** MULTI-PRINT MODULE LOADED ***');