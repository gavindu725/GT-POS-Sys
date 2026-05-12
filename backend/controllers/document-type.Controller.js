import con from "../config/db.config.js";

// Get all document types (active only by default)
const getAllDocumentTypes = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true";

    let query = `
      SELECT 
        dt.*,
        dc.category_name,
        dc.id as category_id
      FROM document_type dt
      LEFT JOIN document_category dc ON dt.fk_category_id = dc.id
    `;
    if (!includeInactive) {
      query += " WHERE dt.is_active = 1";
    }
    query += " ORDER BY dt.display_order ASC";

    const [result] = await con.query(query);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching document types:", error);
    return res.status(500).json({ Error: "Failed to fetch document types" });
  }
};

// Get document types grouped by category
const getDocumentTypesByCategory = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true";

    let query = `
      SELECT 
        dt.*,
        dc.id as category_id,
        dc.category_name,
        dc.display_order as category_order
      FROM document_type dt
      LEFT JOIN document_category dc ON dt.fk_category_id = dc.id
    `;
    if (!includeInactive) {
      query += " WHERE dt.is_active = 1 AND dc.is_active = 1";
    }
    query += " ORDER BY dc.display_order ASC, dt.display_order ASC";

    const [result] = await con.query(query);

    // Group by category ID
    const grouped = result.reduce((acc, doc) => {
      const categoryId = doc.category_id;
      if (!acc[categoryId]) {
        acc[categoryId] = {
          id: categoryId,
          name: doc.category_name,
          shortName: doc.category_name.replace(/Category \d+ – /, ""),
          documents: [],
        };
      }
      acc[categoryId].documents.push({
        id: doc.id,
        name: doc.name,
        isVariable: doc.is_variable === 1,
        displayOrder: doc.display_order,
        isActive: doc.is_active === 1,
      });
      return acc;
    }, {});

    return res.status(200).json(grouped);
  } catch (error) {
    console.error("Error fetching document categories:", error);
    return res
      .status(500)
      .json({ Error: "Failed to fetch document categories" });
  }
};

// Get single document type by ID
const getDocumentTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await con.query(
      "SELECT * FROM document_type WHERE id = ?",
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({ Error: "Document type not found" });
    }

    return res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error fetching document type:", error);
    return res.status(500).json({ Error: "Failed to fetch document type" });
  }
};

// Add new document type
const addDocumentType = async (req, res) => {
  try {
    const { name, fk_category_id, display_order, is_variable, is_active } =
      req.body;

    // Validation
    if (!name || !fk_category_id) {
      return res
        .status(400)
        .json({ Error: "Name and category ID are required" });
    }

    // Check if category exists
    const [category] = await con.query(
      "SELECT id FROM document_category WHERE id = ?",
      [fk_category_id]
    );
    if (category.length === 0) {
      return res.status(400).json({ Error: "Invalid category ID" });
    }

    // Check if name already exists
    const [existing] = await con.query(
      "SELECT id FROM document_type WHERE name = ?",
      [name]
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ Error: "Document type with this name already exists" });
    }

    // If display_order not provided, get the max and add 1
    let order = display_order;
    if (!order) {
      const [maxOrder] = await con.query(
        "SELECT MAX(display_order) as maxOrder FROM document_type WHERE fk_category_id = ?",
        [fk_category_id]
      );
      order = (maxOrder[0].maxOrder || 0) + 1;
    }

    const [result] = await con.query(
      "INSERT INTO document_type (name, fk_category_id, display_order, is_variable, is_active) VALUES (?, ?, ?, ?, ?)",
      [
        name,
        fk_category_id,
        order,
        is_variable ? 1 : 0,
        is_active !== false ? 1 : 0,
      ]
    );

    return res.status(201).json({
      Status: "Success",
      id: result.insertId,
      message: "Document type added successfully",
    });
  } catch (error) {
    console.error("Error adding document type:", error);
    return res.status(500).json({ Error: "Failed to add document type" });
  }
};

// Update document type
const updateDocumentType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, fk_category_id, display_order, is_variable, is_active } =
      req.body;

    // Check if document type exists
    const [existing] = await con.query(
      "SELECT id FROM document_type WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ Error: "Document type not found" });
    }

    // Check if new name conflicts with another document type
    if (name) {
      const [nameCheck] = await con.query(
        "SELECT id FROM document_type WHERE name = ? AND id != ?",
        [name, id]
      );
      if (nameCheck.length > 0) {
        return res
          .status(400)
          .json({ Error: "Document type with this name already exists" });
      }
    }

    // Validate category if provided
    if (fk_category_id) {
      const [category] = await con.query(
        "SELECT id FROM document_category WHERE id = ?",
        [fk_category_id]
      );
      if (category.length === 0) {
        return res.status(400).json({ Error: "Invalid category ID" });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (fk_category_id !== undefined) {
      updates.push("fk_category_id = ?");
      values.push(fk_category_id);
    }
    if (display_order !== undefined) {
      updates.push("display_order = ?");
      values.push(display_order);
    }
    if (is_variable !== undefined) {
      updates.push("is_variable = ?");
      values.push(is_variable ? 1 : 0);
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
      `UPDATE document_type SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return res.status(200).json({
      Status: "Success",
      message: "Document type updated successfully",
    });
  } catch (error) {
    console.error("Error updating document type:", error);
    return res.status(500).json({ Error: "Failed to update document type" });
  }
};

// Bulk reorder document types
const reorderDocumentTypes = async (req, res) => {
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
          "UPDATE document_type SET display_order = ? WHERE id = ?",
          [item.display_order, item.id]
        );
      }

      await connection.commit();
      connection.release();

      return res.status(200).json({
        Status: "Success",
        message: "Document types reordered successfully",
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error("Error reordering document types:", error);
    return res.status(500).json({ Error: "Failed to reorder document types" });
  }
};

// Delete document type (soft delete by default)
const deleteDocumentType = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query; // ?hard=true for permanent deletion

    // Check if document type exists
    const [existing] = await con.query(
      "SELECT id FROM document_type WHERE id = ?",
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ Error: "Document type not found" });
    }

    // Check if document type is being used
    const [usage] = await con.query(
      "SELECT COUNT(*) as count FROM employee_document WHERE fk_document_type_id = ?",
      [id]
    );

    if (usage[0].count > 0 && hard === "true") {
      return res.status(400).json({
        Error:
          "Cannot permanently delete document type as it is being used by employee documents. Use soft delete instead.",
      });
    }

    if (hard === "true") {
      // Permanent deletion
      await con.query("DELETE FROM document_type WHERE id = ?", [id]);
      return res.status(200).json({
        Status: "Success",
        message: "Document type permanently deleted",
      });
    } else {
      // Soft delete
      await con.query("UPDATE document_type SET is_active = 0 WHERE id = ?", [
        id,
      ]);
      return res.status(200).json({
        Status: "Success",
        message: "Document type deactivated successfully",
      });
    }
  } catch (error) {
    console.error("Error deleting document type:", error);
    return res.status(500).json({ Error: "Failed to delete document type" });
  }
};

export {
  getAllDocumentTypes,
  getDocumentTypesByCategory,
  getDocumentTypeById,
  addDocumentType,
  updateDocumentType,
  reorderDocumentTypes,
  deleteDocumentType,
};
