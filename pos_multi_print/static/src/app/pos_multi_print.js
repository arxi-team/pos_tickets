/** @odoo-module **/

import { PosStore } from "@point_of_sale/app/store/pos_store";
import { patch } from "@web/core/utils/patch";

console.log('*** MULTI-PRINT MODULE LOADING ***');

patch(PosStore.prototype, {
    async printReceipt(options = {}) {
        // Check if multi-print is enabled
        if (this.config.enable_multi_print) {
            console.log('*** MULTI-PRINT TRIGGERED ***');
            const order = options.order || this.get_order();

            if (!order) {
                console.error('*** NO ORDER FOUND ***');
                return false;
            }

            const products = this._getPrintableProducts(order);
            console.log('*** PRINTING', products.length, 'PRODUCT PAGES ***');

            if (products.length > 0) {
                this._printProductPapers(products);
                return true;
            }
        }

        // Call parent method directly
        return PosStore.prototype.printReceipt.call(this, options);
    },

    _getPrintableProducts(order) {
        const products = [];
        console.log('*** ORDER LINES:', order.get_orderlines());

        for (const line of order.get_orderlines()) {
            const qty = line.get_quantity();

            // Debug: log the line structure
            console.log('*** LINE:', line);
            console.log('*** LINE.PRODUCT:', line.product);
            console.log('*** LINE.PRODUCT_ID:', line.product_id);

            // Try different ways to access the product
            let product = null;
            if (line.product) {
                product = line.product;
            } else if (line.product_id) {
                product = line.product_id;
            }

            console.log('*** FOUND PRODUCT:', product);

            // Add one entry per quantity unit
            for (let i = 0; i < qty; i++) {
                products.push({
                    product_name: product ? (product.display_name || product.name || 'Unknown Product') : 'Unknown Product',
                    quantity: 1,
                    price_unit: line.get_unit_price(),
                });
            }
        }

        console.log('*** PRODUCTS ARRAY:', products);
        return products;
    },

    _printProductPapers(products) {
        let htmlContent = '<!DOCTYPE html><html><head><title>Product Papers</title>';
        htmlContent += '<style>';
        htmlContent += '@page { size: 80mm 35mm; margin: 5mm; }';
        htmlContent += 'body { font-family: Arial, sans-serif; margin: 0; padding: 0; }';
        htmlContent += '.product-page { ';
        htmlContent += '  page-break-after: always; ';
        htmlContent += '  width: 100%; ';
        htmlContent += '  height: 100vh; ';
        htmlContent += '  position: relative; ';
        htmlContent += '}';
        htmlContent += '.product-name { ';
        htmlContent += '  font-size: 60px; ';
        htmlContent += '  font-weight: bold; ';
        htmlContent += '  text-transform: uppercase; ';
        htmlContent += '  position: absolute; ';
        htmlContent += '  top: 5mm; ';
        htmlContent += '  left: 5mm; ';
        htmlContent += '  margin: 0; ';
        htmlContent += '}';
        htmlContent += '</style></head><body>';

        for (const product of products) {
            const safeName = this._escapeHtml(product.product_name);
            htmlContent += '<div class="product-page">';
            htmlContent += '<h1 class="product-name">' + safeName + '</h1>';
            htmlContent += '</div>';
        }

        htmlContent += '</body></html>';
        console.log('*** GENERATED HTML WITH', products.length, 'PAGES ***');

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        } else {
            console.error('*** COULD NOT OPEN PRINT WINDOW ***');
        }
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
});

console.log('*** MULTI-PRINT MODULE LOADED ***');
