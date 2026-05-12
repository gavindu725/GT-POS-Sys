import pool from "../config/db.config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import archiver from "archiver";
import axios from "axios";
import cloudinary from "../config/cloudinary.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to delete entire employee folder from Cloudinary
// Files are stored as: employees/{NIC}/ for photos and employees/{NIC}/documents/ for documents
const deleteCloudinaryFolder = async (nic) => {
  if (!nic) return;

  const folderPath = `employees/${nic}`;

  try {
    // First, delete all resources in the folder and subfolders
    // Delete images (profile photos)
    try {
      await cloudinary.api.delete_resources_by_prefix(folderPath, {
        resource_type: "image",
      });
      console.log(`Deleted images in folder: ${folderPath}`);
    } catch (err) {
      console.log(`No images to delete in folder: ${folderPath}`);
    }

    // Delete raw files (PDFs, documents)
    try {
      await cloudinary.api.delete_resources_by_prefix(folderPath, {
        resource_type: "raw",
      });
      console.log(`Deleted raw files in folder: ${folderPath}`);
    } catch (err) {
      console.log(`No raw files to delete in folder: ${folderPath}`);
    }

    // Delete the documents subfolder first
    try {
      await cloudinary.api.delete_folder(`${folderPath}/documents`);
      console.log(`✅ Deleted Cloudinary folder: ${folderPath}/documents`);
    } catch (err) {
      console.log(
        `Could not delete folder ${folderPath}/documents:`,
        err.message,
      );
    }

    // Then delete the main employee folder
    try {
      await cloudinary.api.delete_folder(folderPath);
      console.log(`✅ Deleted Cloudinary folder: ${folderPath}`);
    } catch (err) {
      console.log(`Could not delete folder ${folderPath}:`, err.message);
    }
  } catch (error) {
    console.error(
      `Failed to delete Cloudinary folder: ${folderPath}`,
      error.message,
    );
  }
};

export const submitTransferRequest = async (req, res) => {
  const {
    fk_emp_id,
    transfer_type,
    to_location,
    transfer_date,
    reason,
    requested_by,
    remarks,
  } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO employee_transfer (fk_emp_id, transfer_type, to_location, transfer_date, reason, requested_by, remarks, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fk_emp_id,
        transfer_type || "regular",
        to_location,
        transfer_date,
        reason || null,
        requested_by || null,
        remarks || null,
        1,
      ],
    );
    await pool.query("UPDATE employee SET transfer_status = ? WHERE id = ?", [
      "on_transfer",
      fk_emp_id,
    ]);
    res.json({
      success: true,
      message: "Transfer request submitted successfully",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Error submitting transfer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit transfer request",
      error: error.message,
    });
  }
};

export const getTransferRequests = async (req, res) => {
  const { status, type, employeeId, startDate, endDate } = req.query;
  try {
    let query = `SELECT et.*, e.name_with_init as employee_name, e.nic as employee_nic, e.email, e.photo as photo_url, jr.name as job_role_name, jc.class_code 
      FROM employee_transfer et JOIN employee e ON et.fk_emp_id = e.id 
      LEFT JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL 
      LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id 
      LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id 
      LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id WHERE 1=1`;
    const params = [];
    if (status) {
      query += " AND et.transfer_status = ?";
      params.push(status);
    }
    if (type) {
      query += " AND et.transfer_type = ?";
      params.push(type);
    }
    if (employeeId) {
      query += " AND et.fk_emp_id = ?";
      params.push(employeeId);
    }
    if (startDate) {
      query += " AND et.transfer_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND et.transfer_date <= ?";
      params.push(endDate);
    }
    query += " ORDER BY et.transfer_date DESC, et.created_at DESC";
    const [transfers] = await pool.query(query, params);
    res.json({ success: true, data: transfers });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transfer requests",
      error: error.message,
    });
  }
};

export const getTransferById = async (req, res) => {
  const { id } = req.params;
  try {
    const [transfers] = await pool.query(
      `SELECT et.*, e.name_with_init as employee_name, e.nic as employee_nic, e.email, e.photo as photo_url, e.dob as date_of_birth, e.transfer_status as employee_transfer_status, jr.name as job_role_name, jc.class_code 
       FROM employee_transfer et JOIN employee e ON et.fk_emp_id = e.id 
       LEFT JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL 
       LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id 
       LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id 
       LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id WHERE et.id = ?`,
      [id],
    );
    if (transfers.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Transfer request not found" });
    res.json({ success: true, data: transfers[0] });
  } catch (error) {
    console.error("Error fetching transfer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transfer request",
      error: error.message,
    });
  }
};

export const approveTransfer = async (req, res) => {
  const { id } = req.params;
  const { approved_by, remarks } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE employee_transfer SET transfer_status = 'approved', approved_by = ?, approval_date = CURDATE(), remarks = ? WHERE id = ?`,
      [approved_by || "Admin", remarks || null, id],
    );
    await connection.commit();
    res.json({
      success: true,
      message: "Transfer request approved successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error approving transfer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve transfer request",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

export const completeTransfer = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [transfers] = await connection.query(
      "SELECT fk_emp_id FROM employee_transfer WHERE id = ?",
      [id],
    );
    if (transfers.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Transfer not found" });
    }
    await connection.query(
      "UPDATE employee_transfer SET transfer_status = 'completed' WHERE id = ?",
      [id],
    );
    await connection.query(
      "UPDATE employee SET transfer_status = 'transferred' WHERE id = ?",
      [transfers[0].fk_emp_id],
    );
    await connection.commit();
    res.json({ success: true, message: "Transfer completed successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error completing transfer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete transfer",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

export const cancelTransfer = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [transfers] = await connection.query(
      "SELECT fk_emp_id FROM employee_transfer WHERE id = ?",
      [id],
    );
    if (transfers.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Transfer not found" });
    }
    await connection.query(
      `UPDATE employee_transfer SET transfer_status = 'cancelled', remarks = CONCAT(COALESCE(remarks, ''), '\nCancelled: ', ?) WHERE id = ?`,
      [reason || "No reason provided", id],
    );
    await connection.query(
      "UPDATE employee SET transfer_status = 'active' WHERE id = ?",
      [transfers[0].fk_emp_id],
    );
    await connection.commit();
    res.json({ success: true, message: "Transfer cancelled successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Error cancelling transfer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel transfer",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

export const backupEmployeeData = async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();

    // Get transfer and employee data
    const [transfers] = await connection.query(
      `SELECT et.*, 
        e.id as employee_id, 
        e.full_name, 
        e.name_with_init, 
        e.nic
      FROM employee_transfer et 
      JOIN employee e ON et.fk_emp_id = e.id 
      WHERE et.id = ?`,
      [id],
    );

    if (transfers.length === 0) {
      if (connection) connection.release();
      return res
        .status(404)
        .json({ success: false, message: "Transfer request not found" });
    }

    const transfer = transfers[0];
    const empId = transfer.fk_emp_id;

    // Get employee documents from additional_info
    const [documents] = await connection.query(
      `SELECT ed.*, dt.name as document_type_name
       FROM employee_document ed
       JOIN document_type dt ON ed.fk_document_type_id = dt.id
       WHERE ed.fk_emp_id = ?
       ORDER BY dt.name, ed.instance_index`,
      [empId],
    );

    if (documents.length === 0) {
      if (connection) connection.release();
      return res.status(404).json({
        success: false,
        message: "No documents found for this employee",
      });
    }

    // Create ZIP filename for download
    const zipFileName = `${transfer.name_with_init.replace(/[^a-z0-9]/gi, "_")}_${transfer.nic}_backup.zip`;

    // Set response headers for file download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${zipFileName}"`,
    );

    // Create archive and pipe directly to response
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      if (connection) connection.release();
      throw err;
    });

    archive.on("end", async () => {
      try {
        // Update transfer record to mark as backed up
        await pool.query(
          `UPDATE employee_transfer 
           SET is_data_backed_up = TRUE, 
               backup_date = NOW()
           WHERE id = ?`,
          [id],
        );
        console.log(`✅ Backup completed for transfer ${id}`);
      } catch (error) {
        console.error("Error updating transfer record:", error);
      } finally {
        if (connection) connection.release();
      }
    });

    // Pipe archive directly to response (sends to browser for download)
    archive.pipe(res);

    // Create employee info text file
    const employeeInfo = `Employee Backup Information
================================
Employee Name: ${transfer.full_name}
Name with Initials: ${transfer.name_with_init}
NIC: ${transfer.nic}
Transfer ID: ${id}
Transfer Type: ${transfer.transfer_type}
Transfer Date: ${transfer.transfer_date}
Destination: ${transfer.to_location}
Backup Date: ${new Date().toISOString()}
Total Documents: ${documents.length}

Document List:
${documents.map((doc, idx) => `${idx + 1}. ${doc.document_type_name} ${doc.instance_index > 0 ? `(Instance ${doc.instance_index})` : ""} - ${doc.page_count || 0} pages`).join("\n")}
`;

    archive.append(employeeInfo, { name: "employee_info.txt" });

    // Download and add each document to the ZIP
    for (const doc of documents) {
      if (doc.cloudinary_url) {
        try {
          console.log(`📥 Downloading: ${doc.document_type_name}`);
          const response = await axios.get(doc.cloudinary_url, {
            responseType: "arraybuffer",
          });

          // Extract file extension from URL or default to pdf
          const urlParts = doc.cloudinary_url.split(".");
          const extension =
            urlParts[urlParts.length - 1].split("?")[0] || "pdf";

          // Create filename
          const fileName = `${doc.document_type_name.replace(/[^a-z0-9]/gi, "_")}${doc.instance_index > 0 ? `_${doc.instance_index}` : ""}.${extension}`;

          archive.append(Buffer.from(response.data), { name: fileName });
        } catch (error) {
          console.error(
            `Failed to download document ${doc.id}:`,
            error.message,
          );
          // Add error note to archive
          archive.append(`Failed to download: ${error.message}`, {
            name: `ERROR_${doc.document_type_name}.txt`,
          });
        }
      }
    }

    // Finalize the archive (this will trigger the download)
    await archive.finalize();
  } catch (error) {
    if (connection) connection.release();
    console.error("Error backing up employee data:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to backup employee data",
      error: error.message,
    });
  }
};

export const deleteEmployeeData = async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if transfer exists and is backed up
    const [transfers] = await connection.query(
      "SELECT fk_emp_id, is_data_backed_up, transfer_status FROM employee_transfer WHERE id = ?",
      [id],
    );

    if (transfers.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Transfer request not found",
      });
    }

    const { fk_emp_id, is_data_backed_up } = transfers[0];

    if (!is_data_backed_up) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete employee data without backup. Please backup first.",
      });
    }

    // Get employee NIC for Cloudinary folder deletion
    const [employee] = await connection.query(
      "SELECT nic FROM employee WHERE id = ?",
      [fk_emp_id],
    );

    // Delete entire Cloudinary folder for this employee
    if (employee.length > 0 && employee[0].nic) {
      console.log(
        `🗑️ Deleting Cloudinary folder for employee ${fk_emp_id} (NIC: ${employee[0].nic})...`,
      );
      await deleteCloudinaryFolder(employee[0].nic);
      console.log(`✅ Cloudinary cleanup complete for employee ${fk_emp_id}`);
    }

    // Delete employee documents from database
    await connection.query(
      "DELETE FROM employee_document WHERE fk_emp_id = ?",
      [fk_emp_id],
    );
    console.log(`✅ Deleted employee documents for employee ${fk_emp_id}`);

    // Delete employee career history
    await connection.query("DELETE FROM employee_career WHERE fk_emp_id = ?", [
      fk_emp_id,
    ]);
    console.log(`✅ Deleted career history for employee ${fk_emp_id}`);

    // Delete employee from main table (this will cascade delete related records)
    await connection.query("DELETE FROM employee WHERE id = ?", [fk_emp_id]);
    console.log(`✅ Deleted employee record ${fk_emp_id}`);

    // Mark transfer as deleted
    await connection.query(
      `UPDATE employee_transfer 
       SET is_deleted = TRUE, 
           deleted_date = NOW() 
       WHERE id = ?`,
      [id],
    );

    await connection.commit();

    res.json({
      success: true,
      message:
        "Employee data deleted successfully. All records have been removed from the system.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error deleting employee data:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to delete employee data",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

export const getTransferStatistics = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT COUNT(*) as total_transfers,
        SUM(CASE WHEN transfer_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN transfer_status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN transfer_status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN transfer_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN transfer_type = 'regular' THEN 1 ELSE 0 END) as regular_transfers,
        SUM(CASE WHEN transfer_type = 'pleasant' THEN 1 ELSE 0 END) as pleasant_transfers,
        SUM(CASE WHEN is_data_backed_up = TRUE THEN 1 ELSE 0 END) as backed_up,
        SUM(CASE WHEN is_deleted = TRUE THEN 1 ELSE 0 END) as deleted
      FROM employee_transfer
    `);
    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error("Error fetching transfer statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transfer statistics",
      error: error.message,
    });
  }
};

export default {
  submitTransferRequest,
  getTransferRequests,
  getTransferById,
  approveTransfer,
  completeTransfer,
  cancelTransfer,
  backupEmployeeData,
  deleteEmployeeData,
  getTransferStatistics,
};
