# -*- coding: utf-8 -*-

from odoo import models, fields


class PosConfig(models.Model):
    _inherit = 'pos.config'

    enable_multi_print = fields.Boolean(
        string='Enable Multi-Print',
        default=False,
        help='Enable printing one paper per product quantity instead of a single receipt'
    )