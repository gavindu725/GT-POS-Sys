import con from "../config/db.config.js";
import cloudinary from "../config/cloudinary.config.js";

const getJobRoles = async (req, res) => {
  try {
    const [jobRoles] = await con.query(
      `SELECT id, name
       FROM job_role
       ORDER BY name`,
    );
    res.status(200).json({ success: true, data: jobRoles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getJobRoleClassId = async (req, res) => {
  try {
    const { jobRoleId, jobClassId } = req.query;

    if (!jobRoleId || !jobClassId) {
      return res.status(400).json({
        success: false,
        message: "Job role ID and job class ID are required",
      });
    }

    const [result] = await con.query(
      `SELECT jrc.id, jrc.fk_salary_scale_id, ss.code as salary_code
       FROM job_role_class jrc
       JOIN salary_scale ss ON jrc.fk_salary_scale_id = ss.id
       WHERE jrc.fk_job_role_id = ? AND jrc.fk_job_class_id = ?`,
      [jobRoleId, jobClassId],
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job role class combination not found",
      });
    }

    res.status(200).json({ success: true, data: result[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addEmployee = async (req, res) => {
  try {
    const photoUrl = req.body.profilePhoto;

    const [result] = await con.query(
      `INSERT INTO employee (full_name, name_with_init, nic, address, dob, gender, marital_status, email, phone1, phone2, permanent_status, career_start_date, retirement_date, photo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.fullName,
        req.body.nameWithInitials,
        req.body.nic,
        req.body.address,
        req.body.dob,
        req.body.gender,
        req.body.mstatus,
        req.body.email,
        req.body.phone1,
        req.body.phone2 || null,
        req.body.permanentStatus || "C",
        req.body.careerStartDate,
        req.body.retirementDate,
        photoUrl,
      ],
    );

    const empId = result.insertId;

    const [jobRoleClassResult] = await con.query(
      "SELECT id FROM job_role_class WHERE id = ?",
      [req.body.jobRoleClass],
    );
    if (jobRoleClassResult.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Invalid job role class" });

    // Calculate phase from years if yearsInCurrentClass is provided
    let salaryPhaseId = null;
    let totalYears = 0; // Default to 0 instead of null

    if (req.body.yearsInCurrentClass && req.body.jobRoleClass) {
      totalYears = parseInt(req.body.yearsInCurrentClass);

      // Get all phases for this job role class to determine current phase
      const [phases] = await con.query(
        `SELECT id, phase_order, years 
         FROM salary_increment_phase 
         WHERE fk_salary_scale_id = (
           SELECT fk_salary_scale_id 
           FROM job_role_class 
           WHERE id = ?
         ) 
         ORDER BY phase_order ASC`,
        [req.body.jobRoleClass],
      );

      // Find which phase the total years falls into
      let cumulativeYears = 0;
      for (const phase of phases) {
        if (totalYears <= cumulativeYears + phase.years) {
          salaryPhaseId = phase.id;
          break;
        }
        cumulativeYears += phase.years;
      }
    }

    // Insert employee career record with position tracking fields
    await con.query(
      `INSERT INTO employee_career (
        fk_emp_id, fk_job_role_class_id, start_date, appointment_type, remarks,
        current_class_promotion_date, fk_current_salary_phase_id, current_salary_year_in_phase,
        eb_exam_status, eb_exam_date, has_active_inquiry, inquiry_reason,
        hold_increment, hold_salary, disable_employment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empId,
        req.body.jobRoleClass,
        req.body.careerStartDate,
        req.body.appointmentType || "Recruitment",
        req.body.remarks || null,
        req.body.currentClassPromotionDate || req.body.careerStartDate,
        salaryPhaseId,
        totalYears,
        req.body.ebExamStatus || "Not Done",
        req.body.ebExamDate || null,
        req.body.hasActiveInquiry === true ||
        req.body.hasActiveInquiry === "true"
          ? 1
          : 0,
        req.body.inquiryReason || null,
        req.body.holdIncrement === true || req.body.holdIncrement === "true"
          ? 1
          : 0,
        req.body.holdSalary === true || req.body.holdSalary === "true" ? 1 : 0,
        req.body.disableEmployment === true ||
        req.body.disableEmployment === "true"
          ? 1
          : 0,
      ],
    );

    const efficiencies = JSON.parse(req.body.efficiencies || "[]");
    if (efficiencies.length > 0) {
      const [careerResult] = await con.query(
        "SELECT id FROM employee_career WHERE fk_emp_id = ? ORDER BY start_date DESC LIMIT 1",
        [empId],
      );
      const careerId = careerResult[0].id;
      await con.query(
        "INSERT INTO efficiency_bar (fk_employee_career_id, bar_level, cleared_date, remarks) VALUES ?",
        [
          efficiencies.map((e) => [
            careerId,
            e.level,
            e.efficiency_date,
            e.remarks || null,
          ]),
        ],
      );
    }

    res.status(201).json({
      success: true,
      message: "Employee added successfully",
      data: { id: empId },
    });
  } catch (error) {
    console.error("Error adding employee:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllEmployees = async (req, res) => {
  try {
    const [employees] = await con.query(
      `SELECT 
      e.id, 
      e.full_name, 
      e.name_with_init, 
      e.nic, 
      e.address, 
      e.dob, 
      e.gender, 
      e.marital_status, 
      e.email, 
      e.phone1, 
      e.phone2, 
      e.career_start_date, 
      e.retirement_date, 
      e.permanent_status, 
      e.photo,
      jr.name AS job_role_name,
      jc.class_code,
      ss.code AS salary_code,
      ec.start_date AS position_start_date,
      ec.appointment_type,
      GROUP_CONCAT(DISTINCT eb.bar_level ORDER BY eb.cleared_date DESC) AS efficiency_levels
      FROM employee e
      LEFT JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
      LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
      LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
      LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id
      LEFT JOIN salary_scale ss ON jrc.fk_salary_scale_id = ss.id
      LEFT JOIN efficiency_bar eb ON ec.id = eb.fk_employee_career_id
      GROUP BY e.id
      ORDER BY e.id DESC;
    `,
    );

    const employeesWithDetails = await Promise.all(
      employees.map(async (emp) => {
        const [careerHistory] = await con.query(
          `SELECT ec.*, jr.name AS role_name, jc.class_code, ec.appointment_type
           FROM employee_career ec
           LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
           LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
           LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id
           WHERE ec.fk_emp_id = ? ORDER BY ec.start_date DESC`,
          [emp.id],
        );
        return { ...emp, career_history: careerHistory };
      }),
    );

    res.status(200).json({ success: true, data: employeesWithDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getEmployee = async (req, res) => {
  try {
    const empSql = `
      SELECT e.*, jr.name AS job_role_name, jc.class_code, ss.code AS salary_code
      FROM employee e 
      LEFT JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
      LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
      LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
      LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id
      LEFT JOIN salary_scale ss ON jrc.fk_salary_scale_id = ss.id
      WHERE e.id = ?
    `;
    const careerSql = `
      SELECT ec.*, 
             jrc.fk_job_role_id, 
             jrc.fk_job_class_id,
             jr.name AS role_name, 
             jc.class_code, 
             ss.code AS salary_code
      FROM employee_career ec
      LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
      LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
      LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id
      LEFT JOIN salary_scale ss ON jrc.fk_salary_scale_id = ss.id
      WHERE ec.fk_emp_id = ? 
      ORDER BY ec.start_date DESC
    `;
    const efficiencySql = `
      SELECT eb.bar_level, eb.cleared_date, eb.remarks
      FROM efficiency_bar eb
      JOIN employee_career ec ON eb.fk_employee_career_id = ec.id
      WHERE ec.fk_emp_id = ? 
      ORDER BY eb.cleared_date DESC
    `;

    const [empResult] = await con.query(empSql, [req.params.id]);

    if (empResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const employee = empResult[0];

    const [[careerHistory], [efficiencies]] = await Promise.all([
      con.query(careerSql, [req.params.id]),
      con.query(efficiencySql, [req.params.id]),
    ]);

    res.json({
      success: true,
      data: {
        ...employee,
        careerHistory,
        efficiencies,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const empId = req.params.id;

    // Get current employee photo to delete from Cloudinary if changed
    const [currentEmp] = await con.query(
      "SELECT photo FROM employee WHERE id = ?",
      [empId],
    );
    const currentPhoto = currentEmp[0]?.photo;
    const photoUrl = req.body.profilePhoto;

    // Delete old image from Cloudinary if photo changed or removed
    if (currentPhoto && currentPhoto !== photoUrl) {
      try {
        // Extract public_id from URL
        const urlParts = currentPhoto.split("/");
        const publicIdWithExt = urlParts.slice(-2).join("/"); // Get folder/filename
        const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ""); // Remove extension
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error("Failed to delete old image from Cloudinary:", error);
      }
    }

    const updateSql = `
      UPDATE employee SET 
        full_name = ?, name_with_init = ?, nic = ?, address = ?, dob = ?, 
        gender = ?, marital_status = ?, email = ?, phone1 = ?, phone2 = ?, 
        permanent_status = ?, career_start_date = ?, retirement_date = ?, photo = ? 
      WHERE id = ?
    `;

    await con.query(updateSql, [
      req.body.fullName,
      req.body.nameWithInitials,
      req.body.nic,
      req.body.address,
      req.body.dob,
      req.body.gender,
      req.body.mstatus,
      req.body.email,
      req.body.phone1,
      req.body.phone2 || null,
      req.body.permanentStatus || "C",
      req.body.careerStartDate,
      req.body.retirementDate,
      photoUrl,
      empId,
    ]);

    if (req.body.jobRoleClass) {
      const [currentCareer] = await con.query(
        "SELECT id FROM employee_career WHERE fk_emp_id = ? AND end_date IS NULL",
        [empId],
      );

      console.log("Updating inquiry status:", {
        employeeId: empId,
        hasActiveInquiry: req.body.hasActiveInquiry,
        willSaveAs:
          req.body.hasActiveInquiry === true ||
          req.body.hasActiveInquiry === "true"
            ? 1
            : 0,
        inquiryReason: req.body.inquiryReason,
        careerRecordFound: currentCareer.length > 0,
      });

      if (currentCareer.length > 0) {
        // Calculate phase from years if yearsInCurrentClass is provided
        let salaryPhaseId = null;
        let totalYears = null;

        if (req.body.yearsInCurrentClass) {
          totalYears = parseInt(req.body.yearsInCurrentClass);

          // Get all phases for this job role class to determine current phase
          const [phases] = await con.query(
            `SELECT id, phase_order, years 
             FROM salary_increment_phase 
             WHERE fk_salary_scale_id = (
               SELECT fk_salary_scale_id 
               FROM job_role_class 
               WHERE id = ?
             ) 
             ORDER BY phase_order ASC`,
            [req.body.jobRoleClass],
          );

          // Find which phase the total years falls into
          let cumulativeYears = 0;
          for (const phase of phases) {
            if (totalYears <= cumulativeYears + phase.years) {
              salaryPhaseId = phase.id;
              break;
            }
            cumulativeYears += phase.years;
          }
        }

        // Update existing career record with new position tracking fields
        await con.query(
          `UPDATE employee_career SET 
            fk_job_role_class_id = ?,
            current_class_promotion_date = ?,
            fk_current_salary_phase_id = ?,
            current_salary_year_in_phase = ?,
            eb_exam_status = ?,
            eb_exam_date = ?,
            has_active_inquiry = ?,
            inquiry_reason = ?,
            hold_increment = ?,
            hold_salary = ?,
            disable_employment = ?
          WHERE id = ?`,
          [
            req.body.jobRoleClass,
            req.body.currentClassPromotionDate || currentCareer[0].start_date,
            salaryPhaseId,
            totalYears,
            req.body.ebExamStatus || "Not Done",
            req.body.ebExamDate || null,
            req.body.hasActiveInquiry === true ||
            req.body.hasActiveInquiry === "true"
              ? 1
              : 0,
            req.body.inquiryReason || null,
            req.body.holdIncrement === true || req.body.holdIncrement === "true"
              ? 1
              : 0,
            req.body.holdSalary === true || req.body.holdSalary === "true"
              ? 1
              : 0,
            req.body.disableEmployment === true ||
            req.body.disableEmployment === "true"
              ? 1
              : 0,
            currentCareer[0].id,
          ],
        );

        console.log(
          "Inquiry status updated successfully in database for career record:",
          currentCareer[0].id,
        );
      } else {
        // Calculate phase from years if yearsInCurrentClass is provided
        let salaryPhaseId = null;
        let totalYears = null;

        if (req.body.yearsInCurrentClass) {
          totalYears = parseInt(req.body.yearsInCurrentClass);

          // Get all phases for this job role class to determine current phase
          const [phases] = await con.query(
            `SELECT id, phase_order, years 
             FROM salary_increment_phase 
             WHERE fk_salary_scale_id = (
               SELECT fk_salary_scale_id 
               FROM job_role_class 
               WHERE id = ?
             ) 
             ORDER BY phase_order ASC`,
            [req.body.jobRoleClass],
          );

          // Find which phase the total years falls into
          let cumulativeYears = 0;
          for (const phase of phases) {
            if (totalYears <= cumulativeYears + phase.years) {
              salaryPhaseId = phase.id;
              break;
            }
            cumulativeYears += phase.years;
          }
        }

        // Insert new career record if none exists
        await con.query(
          `INSERT INTO employee_career (
            fk_emp_id, fk_job_role_class_id, start_date, appointment_type, remarks,
            current_class_promotion_date, fk_current_salary_phase_id, current_salary_year_in_phase,
            eb_exam_status, eb_exam_date, has_active_inquiry, inquiry_reason,
            hold_increment, hold_salary, disable_employment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            empId,
            req.body.jobRoleClass,
            req.body.positionStartDate || new Date(),
            req.body.appointmentType || "Transfer",
            req.body.remarks || null,
            req.body.currentClassPromotionDate || new Date(),
            salaryPhaseId,
            totalYears,
            req.body.ebExamStatus || "Not Done",
            req.body.ebExamDate || null,
            req.body.hasActiveInquiry === true ||
            req.body.hasActiveInquiry === "true"
              ? 1
              : 0,
            req.body.inquiryReason || null,
            req.body.holdIncrement === true || req.body.holdIncrement === "true"
              ? 1
              : 0,
            req.body.holdSalary === true || req.body.holdSalary === "true"
              ? 1
              : 0,
            req.body.disableEmployment === true ||
            req.body.disableEmployment === "true"
              ? 1
              : 0,
          ],
        );
      }
    }

    res.json({
      success: true,
      message: "Employee updated successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

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

const deleteEmployee = async (req, res) => {
  const connection = await con.getConnection();
  try {
    const empId = req.params.id;

    // Check if employee exists and get NIC for Cloudinary folder
    const [empResult] = await connection.query(
      "SELECT id, nic FROM employee WHERE id = ?",
      [empId],
    );
    if (empResult.length === 0) {
      connection.release();
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    const employeeNic = empResult[0].nic;

    // Delete entire Cloudinary folder for this employee
    console.log(
      `Deleting Cloudinary folder for employee ${empId} (NIC: ${employeeNic})...`,
    );
    await deleteCloudinaryFolder(employeeNic);
    console.log(`Cloudinary cleanup complete for employee ${empId}`);

    await connection.beginTransaction();

    // Delete related records first (due to foreign key constraints)
    // Delete employee documents
    await connection.query(
      "DELETE FROM employee_document WHERE fk_emp_id = ?",
      [empId],
    );

    // Delete employee career records
    await connection.query("DELETE FROM employee_career WHERE fk_emp_id = ?", [
      empId,
    ]);

    // Delete transfer records
    await connection.query(
      "DELETE FROM employee_transfer WHERE fk_emp_id = ?",
      [empId],
    );

    // Finally delete the employee
    await connection.query("DELETE FROM employee WHERE id = ?", [empId]);

    await connection.commit();

    res.json({ success: true, message: "Employee deleted successfully" });
  } catch (err) {
    await connection.rollback();
    console.error("Error deleting employee:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};

const searchEmployees = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const searchTerm = `%${query}%`;

    const [employees] = await con.query(
      `SELECT 
        e.id, 
        e.name_with_init, 
        e.full_name,
        e.nic, 
        e.photo,
        jr.name AS job_role_name,
        jc.class_code,
        e.permanent_status
      FROM employee e
      LEFT JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
      LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
      LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
      LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id
      WHERE 
        e.name_with_init LIKE ? OR 
        e.full_name LIKE ? OR 
        e.nic LIKE ? OR
        jr.name LIKE ?
      ORDER BY e.name_with_init ASC
      LIMIT 10
      `,
      [searchTerm, searchTerm, searchTerm, searchTerm],
    );

    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  getJobRoles,
  getJobRoleClassId,
  addEmployee,
  getAllEmployees,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  searchEmployees,
};
