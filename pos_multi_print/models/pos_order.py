# -*- coding: utf-8 -*-

from odoo import models, api, _
from odoo.exceptions import UserError


class PosOrder(models.Model):
    _inherit = 'pos.order'

    def get_printable_products(self):
        """
        Generate list of products to print (one per quantity)
        Returns a list where each product appears as many times as its quantity
        """
        self.ensure_one()
        printable_products = []

        for line in self.lines:
            qty = int(line.qty)
            # Only add entries for products with positive quantity
            if qty > 0:
                # Add one entry per quantity
                for _ in range(qty):
                    printable_products.append({
                        'name': line.product_id.name,
                        'qty': 1,
                    })

        return printable_products

    def action_print_individual_products(self):
        """
        Action to print individual product papers
        Returns a report action that will print one page per product quantity
        """
        self.ensure_one()

        # Build the report data - properly pass the order IDs
        return {
            'type': 'ir.actions.report',
            'report_name': 'pos_multi_print.product_individual_template',
            'report_type': 'qweb-pdf',
            'context': {'active_ids': self.ids, 'active_model': 'pos.order'},
            'data': None,
            'name': _('Individual Product Papers'),
        }


class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    def get_print_data(self):
        """
        Get print data for a single line item
        """
        self.ensure_one()
        return {
            'product_name': self.product_id.name,
            'quantity': self.qty,
            'price': self.price_unit,
            'discount': self.discount,
            'subtotal': self.price_subtotal_incl,
        }