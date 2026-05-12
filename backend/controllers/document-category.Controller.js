import con from "../config/db.config.js";

// Get all document categories
const getAllCategories = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true";

    let query = "SELECT * FROM document_category";
    if (!includeInactive) {
      query += " WHERE is_active = 1";
    }
    query += " ORDER BY display_order ASC";

    const [result] = await con.query(query);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ Error: "Failed to fetch categories" });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await con.query(
      "SELECT * FROM document_category WHERE id = ?",
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({ Error: "Category not found" });
    }

    return res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({ Error: "Failed to fetch category" });
  }
};

// Add new category
const addCategory = async (req, res) => {
  try {
    const { category_name, display_order, description, is_active } = req.body;

    // Validation
    if (!category_name) {
      return res.status(400).json({
        Error: "category_name is required",
      });
    }

    // Check if category_name already exists
    const [existing] = await con.query(
      "SELECT id FROM document_category WHERE category_name = ?",
      [category_name]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        Error: "Category with this name already exists",
      });
    }

    // Auto-assign display_order if not provided
    let finalDisplayOrder = display_order;
    if (!finalDisplayOrder) {
      const [maxOrder] = await con.query(
        "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM document_category"
      );
      finalDisplayOrder = maxOrder[0].next_order;
    }

    const [result] = await con.query(
      "INSERT INTO document_category (category_name, display_order, description, is_active) VALUES (?, ?, ?, ?)",
      [
        category_name,
        finalDisplayOrder,
        description || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
      ]
    );

    return res.status(201).json({
      Status: "Success",
      message: "Category created successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(500).json({ Error: "Failed to create category" });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, display_order, description, is_active } = req.body;

    // Check if category exists
    const [existing] = await con.query(
      "SELECT id FROM document_category WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ Error: "Category not found" });
    }

    // Check if new name conflicts with another category
    if (category_name) {
      const [nameCheck] = await con.query(
        "SELECT id FROM document_category WHERE category_name = ? AND id != ?",
        [category_name, id]
      );
      if (nameCheck.length > 0) {
        return res.status(400).json({
          Error: "Category with this name already exists",
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (category_name !== undefined) {
      updates.push("category_name = ?");
      values.push(category_name);
    }
    if (display_order !== undefined) {
      updates.push("display_order = ?");
      values.push(display_order);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ Error: "No fields to update" });
    }

    values.push(id);

    await con.query(
      `UPDATE document_category SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return res.status(200).json({
      Status: "Success",
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({ Error: "Failed to update category" });
  }
};

// Bulk reorder categories
const reorderCategories = async (req, res) => {
  try {
    const { orders } = req.body; // Expected: [{ id: 1, display_order: 5 }, ...]

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ Error: "Invalid orders array" });
    }

    // Get a connection from pool for transaction
    const connection = await con.getConnection();

    try {
      await connection.beginTransaction();

      for (const item of orders) {
        await connection.query(
          "UPDATE document_category SET display_order = ? WHERE id = ?",
          [item.display_order, item.id]
        );
      }

      await connection.commit();
      connection.release();

      return res.status(200).json({
        Status: "Success",
        message: "Categories reordered successfully",
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("Error reordering categories:", error);
    return res.status(500).json({ Error: "Failed to reorder categories" });
  }
};

// Delete category (soft delete by default)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query; // ?hard=true for permanent deletion

    // Check if category exists
    const [existing] = await con.query(
      "SELECT id FROM document_category WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ Error: "Category not found" });
    }

    // Check if category is being used by document types
    const [usage] = await con.query(
      "SELECT COUNT(*) as count FROM document_type WHERE fk_category_id = ?",
      [id]
    );

    if (usage[0].count > 0 && hard === "true") {
      return res.status(400).json({
        Error:
          "Cannot permanently delete category as it is being used by document types. Use soft delete instead.",
      });
    }

    if (hard === "true") {
      // Permanent deletion
      await con.query("DELETE FROM document_category WHERE id = ?", [id]);
      return res.status(200).json({
        Status: "Success",
        message: "Category permanently deleted",
      });
    } else {
      // Soft delete
      await con.query(
        "UPDATE document_category SET is_active = 0 WHERE id = ?",
        [id]
      );
      return res.status(200).json({
        Status: "Success",
        message: "Category deactivated successfully",
      });
    }
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ Error: "Failed to delete category" });
  }
};

export {
  getAllCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  reorderCategories,
  deleteCategory,
};
