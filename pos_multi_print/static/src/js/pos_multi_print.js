/** @odoo-module **/

import { Order } from "@point_of_sale/app/store/models";
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
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
    async printReceipt() {
        if (this.pos.config.enable_multi_print) {
            // Trigger multi-print
            await this._printMultiPapers();
        } else {
            // Use normal printing
            await super.printReceipt(...arguments);
        }
    },

    async _printMultiPapers() {
        const order = this.pos.get_order();

        if (!order) {
            return;
        }

        const receipt = order.export_for_printing();

        if (!receipt.multi_print_products || receipt.multi_print_products.length === 0) {
            this.env.services.notification.add(
                "No products to print.",
                {
                    type: "warning",
                    sticky: false,
                }
            );
            return;
        }

        console.log('*** ORDER BACKEND ID:', order.backendId);

        // Try to get the order ID from the backend
        let orderId = order.backendId;

        if (!orderId) {
            console.log('*** NO BACKEND ID, TRYING TO SYNC ORDER...');

            try {
                // Use the POS sync method
                const syncedOrderIds = await this.pos._flush_orders([order]);
                console.log('*** SYNCED ORDER IDS:', syncedOrderIds);

                if (syncedOrderIds && syncedOrderIds.length > 0) {
                    orderId = syncedOrderIds[0];
                    console.log('*** GOT ORDER ID FROM SYNC:', orderId);
                }
            } catch (error) {
                console.error('*** SYNC FAILED:', error);
            }

            if (!orderId) {
                console.log('*** STILL NO ORDER ID, USING DIRECT PRINT METHOD');
                // Fall back to direct printing
                this._printDirectly(receipt.multi_print_products);
                return;
            }
        }

        console.log('*** CALLING REPORT WITH ORDER ID:', orderId);

        // Now use PDF report with custom paper format
        await this.env.services.action.doAction({
            type: 'ir.actions.report',
            report_name: 'pos_multi_print.product_individual_template',
            report_type: 'qweb-pdf',
            res_ids: [orderId],
            res_model: 'pos.order',
            data: { order_id: orderId },
            context: {
                active_ids: [orderId],
                active_model: 'pos.order',
            },
            display_name: 'Product Papers',
        });
    },

    _printDirectly(products) {
        console.log('*** PRINTING DIRECTLY WITH', products.length, 'PRODUCTS');

        // Generate HTML for printing all products
        let htmlContent = '<!DOCTYPE html><html><head><title>Product Papers</title>';
        htmlContent += '<style>';
        htmlContent += '@page { size: 80mm 40mm portrait; margin: 0; }';
        htmlContent += '* { margin: 0; padding: 0; box-sizing: border-box; }';
        htmlContent += 'body { font-family: Arial, sans-serif; }';
        htmlContent += '.product-page { ';
        htmlContent += '  width: 80mm; ';
        htmlContent += '  height: 40mm; ';
        htmlContent += '  page-break-after: always; ';
        htmlContent += '  break-after: page; ';
        htmlContent += '  page-break-inside: avoid; ';
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

        for (const product of products) {
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

// Patch PaymentScreen to handle automatic multi-print
patch(PaymentScreen.prototype, {
    async afterOrderValidation(suggestToSync = true) {
        // Handle multi-print for automatic printing
        if (this.pos.config.enable_multi_print && this.pos.config.iface_print_auto) {
            const order = this.currentOrder;
            if (order && !order._printed) {
                console.log('*** MULTI-PRINT AUTO: Processing', order);

                // Skip the normal automatic printing by marking as printed
                order._printed = true;

                // Call parent without automatic printing
                await super.afterOrderValidation(...arguments);

                // Now do our multi-print
                const receipt = order.export_for_printing();
                if (receipt.multi_print_products && receipt.multi_print_products.length > 0) {
                    console.log('*** AUTO MULTI-PRINT WITH', receipt.multi_print_products.length, 'PRODUCTS');
                    this._printDirectlyAuto(receipt.multi_print_products);
                }
                return;
            }
        }

        // Normal flow - call parent
        await super.afterOrderValidation(...arguments);
    },

    _printDirectlyAuto(products) {
        // Generate HTML for printing
        let htmlContent = '<!DOCTYPE html><html><head><title>Product Papers</title>';
        htmlContent += '<style>';
        htmlContent += '@page { size: 80mm 40mm portrait; margin: 0; }';
        htmlContent += '* { margin: 0; padding: 0; box-sizing: border-box; }';
        htmlContent += 'body { font-family: Arial, sans-serif; }';
        htmlContent += '.product-page { ';
        htmlContent += '  width: 80mm; ';
        htmlContent += '  height: 40mm; ';
        htmlContent += '  page-break-after: always; ';
        htmlContent += '  break-after: page; ';
        htmlContent += '  page-break-inside: avoid; ';
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

        for (const product of products) {
            const safeName = this._escapeHtml(product.product_name);
            htmlContent += `<div class="product-page"><div class="product-name">${safeName}</div></div>`;
        }

        htmlContent += '</body></html>';

        // Print directly
        const printWindow = window.open('', '_blank', 'width=400,height=300');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 300);
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
