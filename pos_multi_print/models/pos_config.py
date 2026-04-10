# -*- coding: utf-8 -*-

from odoo import models, fields


class PosConfig(models.Model):
    _inherit = 'pos.config'

    enable_multi_print = fields.Boolean(
        string='Enable Multi-Print',
        default=False,
        help='Enable printing one paper per product quantity instead of a single receipt'
    )

    # Fix missing field from base Odoo POS module
    epson_printer_ip = fields.Char(
        string='Epson Printer IP',
        help='IP address of the Epson printer'
    )