import pool from "../config/db.config.js";

/**
 * Promotion Path Management Controller
 * Handles department-specific career progression flows
 */

// ==================== Promotion Paths ====================

/**
 * Get all promotion paths
 */
export const getAllPromotionPaths = async (req, res) => {
  try {
    const [paths] = await pool.query(`
      SELECT 
        pp.*,
        COUNT(DISTINCT pps.id) as total_steps,
        COUNT(DISTINCT ec.id) as employees_assigned
      FROM promotion_path pp
      LEFT JOIN promotion_path_step pps ON pp.id = pps.fk_promotion_path_id
      LEFT JOIN employee_career ec ON pp.id = ec.fk_promotion_path_id AND ec.end_date IS NULL
      GROUP BY pp.id
      ORDER BY pp.department, pp.name
    `);

    res.json({
      success: true,
      data: paths,
    });
  } catch (error) {
    console.error("Error fetching promotion paths:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promotion paths",
      error: error.message,
    });
  }
};

/**
 * Get promotion path by ID with all steps
 */
export const getPromotionPathById = async (req, res) => {
  const { id } = req.params;

  try {
    // Get path details
    const [paths] = await pool.query(
      "SELECT * FROM promotion_path WHERE id = ?",
      [id]
    );

    if (paths.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Promotion path not found",
      });
    }

    // Get all steps with role and class details
    const [steps] = await pool.query(
      `SELECT 
        pps.*,
        jr.name as role_name,
        jc.class_code,
        jc.id as job_class_id
      FROM promotion_path_step pps
      INNER JOIN job_role jr ON pps.fk_job_role_id = jr.id
      INNER JOIN job_class jc ON pps.fk_job_class_id = jc.id
      WHERE pps.fk_promotion_path_id = ?
      ORDER BY pps.step_order`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...paths[0],
        steps: steps,
      },
    });
  } catch (error) {
    console.error("Error fetching promotion path:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch promotion path",
      error: error.message,
    });
  }
};

/**
 * Create new promotion path with steps
 */
export const createPromotionPath = async (req, res) => {
  const { name, department, description, is_active, steps } = req.body;

  // Validation
  if (!name || !department) {
    return res.status(400).json({
      success: false,
      message: "Name and department are required",
    });
  }

  if (!steps || steps.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one step is required",
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Insert promotion path
    const [result] = await connection.query(
      `INSERT INTO promotion_path (name, department, description, is_active)
       VALUES (?, ?, ?, ?)`,
      [name, department, description || null, is_active ? 1 : 0]
    );

    const pathId = result.insertId;

    // Insert steps
    const stepValues = steps.map((step, index) => [
      pathId,
      step.step_order || index + 1,
      step.fk_job_role_id,
      step.fk_job_class_id,
      step.min_years_required || null,
      step.requirements || null,
    ]);

    await connection.query(
      `INSERT INTO promotion_path_step 
       (fk_promotion_path_id, step_order, fk_job_role_id, fk_job_class_id, min_years_required, requirements)
       VALUES ?`,
      [stepValues]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Promotion path created successfully",
      data: { id: pathId },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating promotion path:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create promotion path",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Update promotion path
 */
export const updatePromotionPath = async (req, res) => {
  const { id } = req.params;
  const { name, department, description, is_active, steps } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update path details
    await connection.query(
      `UPDATE promotion_path 
       SET name = ?, department = ?, description = ?, is_active = ?
       WHERE id = ?`,
      [name, department, description || null, is_active ? 1 : 0, id]
    );

    // Delete old steps
    await connection.query(
      "DELETE FROM promotion_path_step WHERE fk_promotion_path_id = ?",
      [id]
    );

    // Insert new steps
    if (steps && steps.length > 0) {
      const stepValues = steps.map((step, index) => [
        id,
        step.step_order || index + 1,
        step.fk_job_role_id,
        step.fk_job_class_id,
        step.min_years_required || null,
        step.requirements || null,
      ]);

      await connection.query(
        `INSERT INTO promotion_path_step 
         (fk_promotion_path_id, step_order, fk_job_role_id, fk_job_class_id, min_years_required, requirements)
         VALUES ?`,
        [stepValues]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Promotion path updated successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating promotion path:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update promotion path",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Delete promotion path
 */
export const deletePromotionPath = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if any employees are assigned to this path
    const [assignments] = await pool.query(
      "SELECT COUNT(*) as count FROM employee_career WHERE fk_promotion_path_id = ? AND end_date IS NULL",
      [id]
    );

    if (assignments[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${assignments[0].count} active employee(s) are assigned to this promotion path`,
      });
    }

    await pool.query("DELETE FROM promotion_path WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Promotion path deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting promotion path:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete promotion path",
      error: error.message,
    });
  }
};

// ==================== Employee Promotion Path Assignment ====================

/**
 * Assign promotion path to employee
 */
export const assignPromotionPathToEmployee = async (req, res) => {
  const { employeeId, careerRecordId, promotionPathId, currentStepOrder } =
    req.body;

  if (!careerRecordId || !promotionPathId) {
    return res.status(400).json({
      success: false,
      message: "Career record ID and promotion path ID are required",
    });
  }

  try {
    // Verify promotion path exists
    const [paths] = await pool.query(
      "SELECT * FROM promotion_path WHERE id = ? AND is_active = 1",
      [promotionPathId]
    );

    if (paths.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Promotion path not found or inactive",
      });
    }

    // Update career record with promotion path
    await pool.query(
      `UPDATE employee_career 
       SET fk_promotion_path_id = ?, current_path_step = ?
       WHERE id = ?`,
      [promotionPathId, currentStepOrder || 1, careerRecordId]
    );

    res.json({
      success: true,
      message: "Promotion path assigned successfully",
    });
  } catch (error) {
    console.error("Error assigning promotion path:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign promotion path",
      error: error.message,
    });
  }
};

/**
 * Get employee's current position in promotion path
 */
export const getEmployeePromotionStatus = async (req, res) => {
  const { employeeId } = req.params;

  try {
    const [careers] = await pool.query(
      `SELECT 
        ec.*,
        pp.name as path_name,
        pp.department,
        ec.current_path_step,
        jr.name as current_role_name,
        jc.class_code as current_class
      FROM employee_career ec
      LEFT JOIN promotion_path pp ON ec.fk_promotion_path_id = pp.id
      LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
      LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
      LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id
      WHERE ec.fk_emp_id = ? AND ec.end_date IS NULL
      ORDER BY ec.start_date DESC
      LIMIT 1`,
      [employeeId]
    );

    if (careers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active career record found",
      });
    }

    const career = careers[0];

    if (!career.fk_promotion_path_id) {
      return res.json({
        success: true,
        data: {
          has_path: false,
          current_position: {
            role: career.current_role_name,
            class: career.current_class,
          },
        },
      });
    }

    // Get all steps in the path
    const [allSteps] = await pool.query(
      `SELECT 
        pps.*,
        jr.name as role_name,
        jc.class_code
      FROM promotion_path_step pps
      INNER JOIN job_role jr ON pps.fk_job_role_id = jr.id
      INNER JOIN job_class jc ON pps.fk_job_class_id = jc.id
      WHERE pps.fk_promotion_path_id = ?
      ORDER BY pps.step_order`,
      [career.fk_promotion_path_id]
    );

    // Get current step details
    const currentStep = allSteps.find(
      (s) => s.step_order === career.current_path_step
    );

    // Get next step details
    const nextStep = allSteps.find(
      (s) => s.step_order === career.current_path_step + 1
    );

    // Calculate years in current position
    const startDate = new Date(career.start_date);
    const today = new Date();
    const yearsInPosition =
      (today - startDate) / (1000 * 60 * 60 * 24 * 365.25);

    // Check eligibility for next promotion
    let eligible = false;
    let eligibilityReason = "";

    if (nextStep) {
      if (nextStep.min_years_required) {
        if (yearsInPosition >= nextStep.min_years_required) {
          eligible = true;
          eligibilityReason = "Meets minimum years requirement";
        } else {
          eligible = false;
          const remainingYears = (
            nextStep.min_years_required - yearsInPosition
          ).toFixed(1);
          eligibilityReason = `Need ${remainingYears} more years (minimum ${nextStep.min_years_required} years required)`;
        }
      } else {
        eligible = true;
        eligibilityReason = "No minimum years requirement";
      }
    }

    res.json({
      success: true,
      data: {
        has_path: true,
        path_name: career.path_name,
        department: career.department,
        current_step: career.current_path_step,
        total_steps: allSteps.length,
        years_in_position: parseFloat(yearsInPosition.toFixed(2)),
        current_position: currentStep
          ? {
              step_order: currentStep.step_order,
              role: currentStep.role_name,
              class: currentStep.class_code,
              requirements: currentStep.requirements,
            }
          : null,
        next_position: nextStep
          ? {
              step_order: nextStep.step_order,
              role: nextStep.role_name,
              class: nextStep.class_code,
              min_years_required: nextStep.min_years_required,
              requirements: nextStep.requirements,
              eligible: eligible,
              eligibility_reason: eligibilityReason,
            }
          : null,
        all_steps: allSteps.map((s) => ({
          step_order: s.step_order,
          role: s.role_name,
          class: s.class_code,
          min_years: s.min_years_required,
          requirements: s.requirements,
          is_current: s.step_order === career.current_path_step,
          is_completed: s.step_order < career.current_path_step,
        })),
      },
    });
  } catch (error) {
    console.error("Error getting employee promotion status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get promotion status",
      error: error.message,
    });
  }
};

/**
 * Promote employee to next step in path
 */
export const promoteEmployeeInPath = async (req, res) => {
  const { employeeId } = req.params;
  const { effectiveDate, remarks } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Get current career record
    const [currentCareers] = await connection.query(
      `SELECT * FROM employee_career 
       WHERE fk_emp_id = ? AND end_date IS NULL
       ORDER BY start_date DESC
       LIMIT 1`,
      [employeeId]
    );

    if (currentCareers.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "No active career record found",
      });
    }

    const currentCareer = currentCareers[0];

    if (!currentCareer.fk_promotion_path_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Employee is not assigned to a promotion path",
      });
    }

    // Get next step in path
    const [nextSteps] = await connection.query(
      `SELECT pps.*, jrc.id as job_role_class_id
       FROM promotion_path_step pps
       LEFT JOIN job_role_class jrc ON pps.fk_job_role_id = jrc.fk_job_role_id 
         AND pps.fk_job_class_id = jrc.fk_job_class_id
       WHERE pps.fk_promotion_path_id = ? 
         AND pps.step_order = ?`,
      [currentCareer.fk_promotion_path_id, currentCareer.current_path_step + 1]
    );

    if (nextSteps.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "No next step available in promotion path",
      });
    }

    const nextStep = nextSteps[0];

    if (!nextStep.job_role_class_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Job role class combination not configured for next step. Please configure in Settings.",
      });
    }

    // Close current career record
    await connection.query(
      "UPDATE employee_career SET end_date = ? WHERE id = ?",
      [effectiveDate || new Date(), currentCareer.id]
    );

    // Create new career record for promoted position
    await connection.query(
      `INSERT INTO employee_career 
       (fk_emp_id, fk_job_role_class_id, fk_promotion_path_id, current_path_step, 
        start_date, appointment_type, remarks)
       VALUES (?, ?, ?, ?, ?, 'Promotion', ?)`,
      [
        employeeId,
        nextStep.job_role_class_id,
        currentCareer.fk_promotion_path_id,
        nextStep.step_order,
        effectiveDate || new Date(),
        remarks || `Promoted to ${nextStep.role_name} - ${nextStep.class_code}`,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Employee promoted successfully",
      data: {
        new_step: nextStep.step_order,
        new_position: {
          role: nextStep.role_name,
          class: nextStep.class_code,
        },
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error promoting employee:", error);
    res.status(500).json({
      success: false,
      message: "Failed to promote employee",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

export default {
  getAllPromotionPaths,
  getPromotionPathById,
  createPromotionPath,
  updatePromotionPath,
  deletePromotionPath,
  assignPromotionPathToEmployee,
  getEmployeePromotionStatus,
  promoteEmployeeInPath,
};
