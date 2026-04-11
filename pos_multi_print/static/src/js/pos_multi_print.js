/** @odoo-module **/

import { Order } from "@point_of_sale/app/store/models";
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { patch } from "@web/core/utils/patch";

// Patch Order to add multi-print data
patch(Order.prototype, {
    export_for_printing() {
        const receipt = super.export_for_printing(...arguments);

        // Add multi-print data if enabled
        if (this.pos.config.enable_multi_print) {
            receipt.multi_print_enabled = true;
            receipt.multi_print_products = [];

            const orderlines = this.get_orderlines();
            for (const line of orderlines) {
                const qty = parseInt(line.get_quantity()) || 0;
                const product = line.product;

                // Add one entry per quantity unit
                for (let j = 0; j < qty; j++) {
                    receipt.multi_print_products.push({
                        product_name: product ? (product.display_name || product.name || 'Unknown Product') : 'Unknown Product',
                        quantity: 1,
                        price_unit: line.get_unit_price(),
                        product_id: product ? product.id : null,
                    });
                }
            }
        }

        return receipt;
    },
});

// Patch ReceiptScreen to handle multi-print printing
patch(ReceiptScreen.prototype, {
    printReceipt() {
        if (this.pos.config.enable_multi_print) {
            // Trigger multi-print
            this._printMultiPapers();
        } else {
            // Use normal printing
            super.printReceipt(...arguments);
        }
    },

    _printMultiPapers() {
        const order = this.pos.get_order();
        const receipt = order.export_for_printing();

        if (!receipt.multi_print_products || receipt.multi_print_products.length === 0) {
            return;
        }

        // Generate HTML for printing
        let htmlContent = '<!DOCTYPE html><html><head><title>Product Papers</title>';
        htmlContent += '<style>';
        htmlContent += '@page { size: 80mm 40mm; margin: 0; }';
        htmlContent += '* { margin: 0; padding: 0; box-sizing: border-box; }';
        htmlContent += 'body { font-family: Arial, sans-serif; }';
        htmlContent += '.product-page { ';
        htmlContent += '  width: 80mm; ';
        htmlContent += '  height: 40mm; ';
        htmlContent += '  page-break-after: always; ';
        htmlContent += '  display: flex; ';
        htmlContent += '  align-items: center; ';
        htmlContent += '  justify-content: center; ';
        htmlContent += '  text-align: center; ';
        htmlContent += '}';
        htmlContent += '.product-name { ';
        htmlContent += '  font-size: 22px; ';
        htmlContent += '  font-weight: bold; ';
        htmlContent += '  text-transform: uppercase; ';
        htmlContent += '  padding: 10px; ';
        htmlContent += '}';
        htmlContent += '</style></head><body>';

        for (const product of receipt.multi_print_products) {
            const safeName = this._escapeHtml(product.product_name);
            htmlContent += `<div class="product-page"><div class="product-name">${safeName}</div></div>`;
        }

        htmlContent += '</body></html>';

        // Open print window
        const printWindow = window.open('', '_blank', 'width=400,height=300');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();

            // Wait for content to load before printing
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    },

    _escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
});

console.log('*** POS MULTI-PRINT MODULE LOADED (Odoo 17) ***');
