import con from "../config/db.config.js";

/**
 * Get salary phases for a specific job role class
 * Returns phases with calculation details for current salary
 */
export const getSalaryPhasesByJobRoleClass = async (req, res) => {
  try {
    const { jobRoleClassId } = req.params;

    // Get salary scale for this job role class
    const [jobRoleClass] = await con.query(
      `SELECT jrc.*, ss.code, ss.starting_basic, ss.max_years, ss.final_basic
       FROM job_role_class jrc
       JOIN salary_scale ss ON jrc.fk_salary_scale_id = ss.id
       WHERE jrc.id = ?`,
      [jobRoleClassId]
    );

    if (jobRoleClass.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job role class not found",
      });
    }

    const salaryScaleId = jobRoleClass[0].fk_salary_scale_id;

    // Get all phases for this salary scale
    const [phases] = await con.query(
      `SELECT id, phase_order, years, annual_increment
       FROM salary_increment_phase
       WHERE fk_salary_scale_id = ?
       ORDER BY phase_order`,
      [salaryScaleId]
    );

    // Calculate cumulative years for each phase
    let cumulativeYears = 0;
    const phasesWithDetails = phases.map((phase) => {
      const phaseStart = cumulativeYears + 1;
      cumulativeYears += phase.years;
      return {
        ...phase,
        phase_start_year: phaseStart,
        phase_end_year: cumulativeYears,
        label: `Phase ${phase.phase_order}: Years ${phaseStart}-${cumulativeYears} (${phase.annual_increment}/year)`,
      };
    });

    res.json({
      success: true,
      data: {
        salary_scale: {
          id: salaryScaleId,
          code: jobRoleClass[0].code,
          starting_basic: parseFloat(jobRoleClass[0].starting_basic),
          max_years: jobRoleClass[0].max_years,
          final_basic: parseFloat(jobRoleClass[0].final_basic),
        },
        phases: phasesWithDetails,
      },
    });
  } catch (error) {
    console.error("Error fetching salary phases:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Calculate current salary based on total years in class
 * Automatically determines phase and year within phase
 */
export const calculateSalaryFromYears = async (req, res) => {
  try {
    const { jobRoleClassId, totalYears, promotionDate } = req.body;

    // Comprehensive validation
    if (!jobRoleClassId) {
      return res.status(400).json({
        success: false,
        message: "Job role class ID is required",
      });
    }

    if (totalYears === undefined || totalYears === null || totalYears === "") {
      return res.status(400).json({
        success: false,
        message: "Total years is required",
      });
    }

    const yearsNum = parseInt(totalYears);
    if (isNaN(yearsNum)) {
      return res.status(400).json({
        success: false,
        message: "Total years must be a valid number",
      });
    }

    if (yearsNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Total years cannot be negative",
      });
    }

    // Get salary scale for this job role class
    const [jobRoleClass] = await con.query(
      `SELECT jrc.*, ss.starting_basic, ss.final_basic, ss.max_years, ss.code
       FROM job_role_class jrc
       JOIN salary_scale ss ON jrc.fk_salary_scale_id = ss.id
       WHERE jrc.id = ?`,
      [jobRoleClassId]
    );

    if (jobRoleClass.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job role class not found",
      });
    }

    const salaryScale = jobRoleClass[0];
    const salaryScaleId = salaryScale.fk_salary_scale_id;

    // Validate total years against scale maximum
    if (yearsNum > salaryScale.max_years) {
      return res.status(400).json({
        success: false,
        message: `Total years (${yearsNum}) exceeds maximum for this role (${salaryScale.max_years} years)`,
      });
    }

    // Get all phases to determine which phase the employee is in
    const [phases] = await con.query(
      `SELECT id, phase_order, years, annual_increment
       FROM salary_increment_phase
       WHERE fk_salary_scale_id = ?
       ORDER BY phase_order`,
      [salaryScaleId]
    );

    if (phases.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No salary phases found for this role",
      });
    }

    // Determine current phase and year within phase
    let cumulativeYears = 0;
    let currentPhase = null;
    let yearInCurrentPhase = 0;
    let currentPhaseIncrement = 0;

    for (const phase of phases) {
      if (yearsNum <= cumulativeYears + phase.years) {
        currentPhase = phase;
        yearInCurrentPhase = yearsNum - cumulativeYears;
        currentPhaseIncrement = parseFloat(phase.annual_increment);
        break;
      }
      cumulativeYears += phase.years;
    }

    // If yearsNum exceeds all phases, use the last phase
    if (!currentPhase) {
      currentPhase = phases[phases.length - 1];
      yearInCurrentPhase = currentPhase.years;
      currentPhaseIncrement = parseFloat(currentPhase.annual_increment);
      cumulativeYears = yearsNum - currentPhase.years;
    }

    // Calculate current basic salary
    const currentBasicSalary = Math.min(
      parseFloat(salaryScale.starting_basic) + currentPhaseIncrement * yearsNum,
      parseFloat(salaryScale.final_basic)
    );

    // Calculate next increment
    const nextYear = yearsNum + 1;
    let nextPhaseIncrement = currentPhaseIncrement;

    // Check if next year moves to a different phase
    let nextCumulativeYears = 0;
    for (const phase of phases) {
      if (nextYear <= nextCumulativeYears + phase.years) {
        nextPhaseIncrement = parseFloat(phase.annual_increment);
        break;
      }
      nextCumulativeYears += phase.years;
    }

    const nextBasicSalary = Math.min(
      currentBasicSalary + nextPhaseIncrement,
      parseFloat(salaryScale.final_basic)
    );

    const hasReachedMax =
      currentBasicSalary >= parseFloat(salaryScale.final_basic);

    // Calculate next increment eligibility date if promotion date provided
    let nextIncrementDate = null;
    let daysUntilIncrement = null;
    let isEligibleNow = false;

    if (promotionDate) {
      const promoDate = new Date(promotionDate);
      nextIncrementDate = new Date(promoDate);
      nextIncrementDate.setFullYear(promoDate.getFullYear() + nextYear);

      const today = new Date();
      const timeDiff = nextIncrementDate - today;
      daysUntilIncrement = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      isEligibleNow = daysUntilIncrement <= 0;
    }

    res.json({
      success: true,
      data: {
        current_basic_salary: currentBasicSalary.toFixed(2),
        next_basic_salary: nextBasicSalary.toFixed(2),
        annual_increment: nextPhaseIncrement.toFixed(2),
        total_years: yearsNum,
        current_phase: {
          phase_order: currentPhase.phase_order,
          year_in_phase: yearInCurrentPhase,
          phase_years: currentPhase.years,
          phase_increment: currentPhaseIncrement.toFixed(2),
        },
        next_increment_date: nextIncrementDate
          ? nextIncrementDate.toISOString().split("T")[0]
          : null,
        days_until_increment: daysUntilIncrement,
        is_eligible_now: isEligibleNow,
        has_reached_max: hasReachedMax,
        salary_scale: {
          code: salaryScale.code,
          max_years: salaryScale.max_years,
          final_basic: parseFloat(salaryScale.final_basic).toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error("Error calculating salary:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get years available in a specific phase (deprecated - now using years-based approach)
 */
export const getYearsInPhase = async (req, res) => {
  try {
    const { phaseId } = req.params;

    const [phase] = await con.query(
      `SELECT id, phase_order, years, annual_increment
       FROM salary_increment_phase
       WHERE id = ?`,
      [phaseId]
    );

    if (phase.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Phase not found",
      });
    }

    const years = Array.from({ length: phase[0].years }, (_, i) => ({
      value: i + 1,
      label: `Year ${i + 1}`,
    }));

    res.json({
      success: true,
      data: {
        phase_id: phase[0].id,
        phase_order: phase[0].phase_order,
        total_years: phase[0].years,
        annual_increment: parseFloat(phase[0].annual_increment),
        years,
      },
    });
  } catch (error) {
    console.error("Error fetching years in phase:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
