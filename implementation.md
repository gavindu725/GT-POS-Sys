To support BOTH:

quantity-based inventory
serialized inventory

your current schema only needs a few smart additions — not a complete redesign.

This is how many real ERP/POS systems work.

Goal

Support:

Quantity Inventory

Example:

Product	Qty
Bulb	100
Serialized Inventory

Example:

Product	Serial
DVR	DVR001
DVR	DVR002
Step 1 — Add Product Type Flag

Modify products table.

Add:

is_serialized BOOLEAN DEFAULT FALSE
Updated Example
ALTER TABLE products
ADD is_serialized BOOLEAN DEFAULT FALSE;
Meaning
Value	Meaning
FALSE	Quantity stock
TRUE	Serial tracking
Step 2 — Create Product Serials Table
CREATE TABLE product_serials (
    id INT AUTO_INCREMENT PRIMARY KEY,

    product_id INT NOT NULL,

    variant_id INT NULL,

    serial_number VARCHAR(255) NOT NULL UNIQUE,

    purchase_item_id INT NULL,

    sale_item_id INT NULL,

    status ENUM(
        'in_stock',
        'sold',
        'returned',
        'damaged'
    ) DEFAULT 'in_stock',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id)
    REFERENCES products(id),

    FOREIGN KEY (variant_id)
    REFERENCES product_variants(id)
    ON DELETE SET NULL,

    FOREIGN KEY (purchase_item_id)
    REFERENCES purchase_items(id)
    ON DELETE SET NULL,

    FOREIGN KEY (sale_item_id)
    REFERENCES sale_items(id)
    ON DELETE SET NULL
);
Step 3 — Keep Existing stock_quantity

DO NOT remove:

stock_quantity

from:

products
product_variants

because quantity inventory still needs it.

How System Behaves
Case 1 — Normal Quantity Product

Example:

LED Bulb
is_serialized = FALSE

Inventory handled by:

stock_quantity
Case 2 — Serialized Product

Example:

CCTV DVR
is_serialized = TRUE

Inventory handled by:

product_serials

Each unit tracked separately.

Step 4 — Selling Serialized Products

When cashier sells DVR:

Instead of reducing quantity only:

System selects specific serial:

DVR002

Then:

status = 'sold'
Step 5 — Inventory Count Logic
For Quantity Products

Inventory:

stock_quantity
For Serialized Products

Inventory:

COUNT(product_serials)
WHERE status = 'in_stock'
Step 6 — Optional Improvement

You can auto-sync quantity from serials.

Example:

Serialized product stock quantity becomes:

SELECT COUNT(*)
FROM product_serials
WHERE status = 'in_stock'

Some systems:

physically store quantity
others calculate dynamically