# -*- coding: utf-8 -*-
{
    'name': 'POS Multi Print',
    'version': '17.0.0.2',
    'category': 'Point of Sale',
    'summary': 'Print one paper per product quantity in POS',
    'description': """
        POS Multi Print Module
        ========================
        This module modifies the POS printing behavior to print one paper per product quantity.
        For example, if a product has quantity 3, it will print 3 separate papers with that product name.
    """,
    'author': 'Your Name',
    'website': 'https://www.yourwebsite.com',
    'license': 'LGPL-3',
    'depends': ['point_of_sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/paper_format.xml',
        'views/pos_config_views.xml',
        'views/product_print_report.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_multi_print/static/src/js/pos_multi_print.js',
        ],
    },
    'installable': True,
    'auto_install': False,
    'application': True,
}