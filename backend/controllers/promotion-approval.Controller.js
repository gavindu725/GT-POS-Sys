import pool from "../config/db.config.js";

/**
 * Promotion Approval System Controller
 * Handles promotion applications and approval workflow
 */

// ==================== Promotion Applications ====================

/**
 * Submit a promotion application
 */
export const submitPromotionApplication = async (req, res) => {
  const {
    fk_emp_id,
    fk_current_role_class_id,
    fk_applied_role_class_id,
    justification,
    years_in_service,
    years_in_current_class,
    qualification_details,
    experience_details,
    merit_scores,
    eb_exam_status,
    eb_exam_date,
    supporting_documents,
    submitted_by_user_id,
  } = req.body;

  try {
    const merit_score_total = merit_scores
      ? (merit_scores.service || 0) +
        (merit_scores.qualifications || 0) +
        (merit_scores.competencies || 0) +
        (merit_scores.experience || 0) +
        (merit_scores.aptitude || 0)
      : null;

    const [result] = await pool.query(
      `INSERT INTO promotion_application (
        fk_emp_id, fk_current_role_class_id, fk_applied_role_class_id,
        justification, years_in_service, years_in_current_class,
        qualification_details, experience_details,
        merit_score_service, merit_score_qualifications, merit_score_competencies,
        merit_score_experience, merit_score_aptitude, merit_score_total,
        eb_exam_status, eb_exam_date, supporting_documents, submitted_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fk_emp_id,
        fk_current_role_class_id,
        fk_applied_role_class_id,
        justification || null,
        years_in_service || null,
        years_in_current_class || null,
        qualification_details || null,
        experience_details || null,
        merit_scores?.service || null,
        merit_scores?.qualifications || null,
        merit_scores?.competencies || null,
        merit_scores?.experience || null,
        merit_scores?.aptitude || null,
        merit_score_total,
        eb_exam_status || "Not Required",
        eb_exam_date || null,
        supporting_documents ? JSON.stringify(supporting_documents) : null,
        submitted_by_user_id || null,
      ],
    );

    res.json({
      success: true,
      message: "Promotion application submitted successfully",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Error submitting promotion application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit promotion application",
      error: error.message,
    });
  }
};

/**
 * Get all promotion applications with filters
 */
export const getPromotionApplications = async (req, res) => {
  const { status, employeeId, startDate, endDate } = req.query;

  try {
    let query = `
      SELECT 
        pa.*,
        e.name_with_init as employee_name,
        e.employee_nic,
        e.photo as employee_photo,
        curr_jr.name as current_role,
        curr_jc.class_code as current_class,
        app_jr.name as applied_role,
        app_jc.class_code as applied_class,
        COUNT(pap.id) as review_count
      FROM promotion_application pa
      JOIN employee e ON pa.fk_emp_id = e.id
      JOIN job_role_class curr_jrc ON pa.fk_current_role_class_id = curr_jrc.id
      JOIN job_role curr_jr ON curr_jrc.fk_job_role_id = curr_jr.id
      JOIN job_class curr_jc ON curr_jrc.fk_job_class_id = curr_jc.id
      JOIN job_role_class app_jrc ON pa.fk_applied_role_class_id = app_jrc.id
      JOIN job_role app_jr ON app_jrc.fk_job_role_id = app_jr.id
      JOIN job_class app_jc ON app_jrc.fk_job_class_id = app_jc.id
      LEFT JOIN promotion_approval pap ON pa.id = pap.fk_promotion_application_id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ` AND pa.application_status = ?`;
      params.push(status);
    }

    if (employeeId) {
      query += ` AND pa.fk_emp_id = ?`;
      params.push(employeeId);
    }

    if (startDate) {
      query += ` AND pa.application_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND pa.application_date <= ?`;
      params.push(endDate);
    }

    query += ` GROUP BY pa.id ORDER BY pa.application_date DESC, pa.created_at DESC`;

    const [applications] = await pool.query(query, params);

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error("Error fetching promotion applications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promotion applications",
      error: error.message,
    });
  }
};

/**
 * Get promotion application by ID
 */
export const getPromotionApplicationById = async (req, res) => {
  const { id } = req.params;

  try {
    const [applications] = await pool.query(
      `SELECT 
        pa.*,
        e.name_with_init as employee_name,
        e.employee_nic,
        e.email,
        e.photo as employee_photo,
        curr_jr.name as current_role,
        curr_jc.class_code as current_class,
        app_jr.name as applied_role,
        app_jc.class_code as applied_class
      FROM promotion_application pa
      JOIN employee e ON pa.fk_emp_id = e.id
      JOIN job_role_class curr_jrc ON pa.fk_current_role_class_id = curr_jrc.id
      JOIN job_role curr_jr ON curr_jrc.fk_job_role_id = curr_jr.id
      JOIN job_class curr_jc ON curr_jrc.fk_job_class_id = curr_jc.id
      JOIN job_role_class app_jrc ON pa.fk_applied_role_class_id = app_jrc.id
      JOIN job_role app_jr ON app_jrc.fk_job_role_id = app_jr.id
      JOIN job_class app_jc ON app_jrc.fk_job_class_id = app_jc.id
      WHERE pa.id = ?`,
      [id],
    );

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Promotion application not found",
      });
    }

    // Get approval history
    const [approvals] = await pool.query(
      `SELECT * FROM promotion_approval 
       WHERE fk_promotion_application_id = ?
       ORDER BY review_date DESC, created_at DESC`,
      [id],
    );

    const application = applications[0];
    application.approval_history = approvals;

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error("Error fetching promotion application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promotion application",
      error: error.message,
    });
  }
};

/**
 * Review promotion application (Approve/Reject)
 */
export const reviewPromotionApplication = async (req, res) => {
  const { id } = req.params;
  const {
    action,
    reviewed_by_user_id,
    review_remarks,
    effective_date,
    approval_level,
  } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Validate action
    if (!["approved", "rejected", "returned"].includes(action)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be: approved, rejected, or returned",
      });
    }

    // Get application details
    const [applications] = await connection.query(
      "SELECT * FROM promotion_application WHERE id = ?",
      [id],
    );

    if (applications.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Promotion application not found",
      });
    }

    const application = applications[0];

    // Update application status
    const newStatus =
      action === "approved"
        ? "approved"
        : action === "rejected"
          ? "rejected"
          : "under_review";

    await connection.query(
      "UPDATE promotion_application SET application_status = ? WHERE id = ?",
      [newStatus, id],
    );

    // Insert approval record
    await connection.query(
      `INSERT INTO promotion_approval (
        fk_promotion_application_id, action, reviewed_by_user_id,
        review_remarks, effective_date, approval_level
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        action,
        reviewed_by_user_id || null,
        review_remarks || null,
        effective_date || null,
        approval_level || null,
      ],
    );

    // If approved and effective date provided, update employee career record
    if (action === "approved" && effective_date) {
      // Close current career record
      await connection.query(
        `UPDATE employee_career 
         SET end_date = ? 
         WHERE fk_emp_id = ? AND end_date IS NULL`,
        [effective_date, application.fk_emp_id],
      );

      // Create new career record with promoted position
      await connection.query(
        `INSERT INTO employee_career (
          fk_emp_id, fk_job_role_class_id, start_date, appointment_type
        ) VALUES (?, ?, ?, 'Promotion')`,
        [
          application.fk_emp_id,
          application.fk_applied_role_class_id,
          effective_date,
        ],
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Promotion application ${action} successfully`,
      data: { id, action, newStatus },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error reviewing promotion application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to review promotion application",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Withdraw promotion application
 */
export const withdrawPromotionApplication = async (req, res) => {
  const { id } = req.params;
  const { withdraw_reason } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      "UPDATE promotion_application SET application_status = 'withdrawn' WHERE id = ? AND application_status = 'pending'",
      [id],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Application cannot be withdrawn (not found or not pending)",
      });
    }

    await connection.query(
      `INSERT INTO promotion_approval (
        fk_promotion_application_id, action, review_remarks
      ) VALUES (?, 'withdrawn', ?)`,
      [id, withdraw_reason || "Application withdrawn by applicant"],
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Promotion application withdrawn successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error withdrawing promotion application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to withdraw promotion application",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Get promotion statistics
 */
export const getPromotionStatistics = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN application_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN application_status = 'under_review' THEN 1 ELSE 0 END) as under_review,
        SUM(CASE WHEN application_status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN application_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN application_status = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn,
        AVG(DATEDIFF(
          COALESCE(
            (SELECT review_date FROM promotion_approval 
             WHERE fk_promotion_application_id = promotion_application.id 
             AND action IN ('approved', 'rejected') 
             ORDER BY review_date DESC LIMIT 1),
            CURRENT_DATE
          ),
          application_date
        )) as avg_processing_days
      FROM promotion_application
    `);

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    console.error("Error fetching promotion statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promotion statistics",
      error: error.message,
    });
  }
};

export default {
  submitPromotionApplication,
  getPromotionApplications,
  getPromotionApplicationById,
  reviewPromotionApplication,
  withdrawPromotionApplication,
  getPromotionStatistics,
};
