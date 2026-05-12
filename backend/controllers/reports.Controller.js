import con from "../config/db.config.js";
import archiver from "archiver";
import { PDFDocument } from "pdf-lib";
import fetch from "node-fetch";

// Get all employees for the selector
const getEmployeeList = async (req, res) => {
  try {
    const [employees] = await con.query(
      `SELECT e.id, e.full_name, e.name_with_init, e.nic, e.photo,
              jr.name AS role
       FROM employee e
       LEFT JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
       LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
       LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
       ORDER BY e.full_name`
    );
    res.status(200).json({ success: true, data: employees });
  } catch (error) {
    console.error("Error fetching employee list:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all documents for a specific employee
const getEmployeeDocuments = async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log("Fetching documents for employee:", employeeId);

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    // Get employee details
    console.log("Fetching employee details...");
    const [employeeData] = await con.query(
      `SELECT e.id, e.full_name, e.name_with_init, e.nic, e.address, 
              e.dob, e.gender, e.marital_status, e.email, e.phone1, e.phone2,
              e.permanent_status, e.career_start_date, e.retirement_date, e.photo,
              jr.name AS role,
              jc.class_code AS jobClass,
              ss.code AS salaryScale
       FROM employee e
       LEFT JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
       LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
       LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
       LEFT JOIN job_class jc ON jrc.fk_job_class_id = jc.id
       LEFT JOIN salary_scale ss ON jrc.fk_salary_scale_id = ss.id
       WHERE e.id = ?`,
      [employeeId]
    );
    console.log("Employee data found:", employeeData.length > 0);

    if (employeeData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Get all documents for this employee
    console.log("Fetching employee documents...");
    const [documents] = await con.query(
      `SELECT ed.id, ed.fk_document_type_id, ed.page_count, ed.cloudinary_url, 
              ed.instance_index, ed.uploaded_at,
              dt.name AS documentTypeName
       FROM employee_document ed
       JOIN document_type dt ON ed.fk_document_type_id = dt.id
       WHERE ed.fk_emp_id = ?
       ORDER BY dt.name, ed.instance_index`,
      [employeeId]
    );
    console.log("Documents found:", documents.length);

    // Group documents by document type (since we don't have categories in the DB)
    const documentsByCategory = {};
    documents.forEach((doc) => {
      const category = "All Documents"; // Single category since no categories exist
      if (!documentsByCategory[category]) {
        documentsByCategory[category] = [];
      }
      documentsByCategory[category].push({
        id: doc.id,
        documentTypeId: doc.fk_document_type_id,
        documentTypeName: doc.documentTypeName,
        pageCount: doc.page_count,
        cloudinaryUrl: doc.cloudinary_url,
        instanceIndex: doc.instance_index,
        uploadedAt: doc.uploaded_at,
      });
    });

    res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employeeData[0].id,
          fullName: employeeData[0].full_name,
          nameWithInit: employeeData[0].name_with_init,
          nic: employeeData[0].nic,
          address: employeeData[0].address,
          dob: employeeData[0].dob,
          gender: employeeData[0].gender,
          maritalStatus: employeeData[0].marital_status,
          email: employeeData[0].email,
          phone1: employeeData[0].phone1,
          phone2: employeeData[0].phone2,
          permanentStatus:
            employeeData[0].permanent_status === "P" ? "Permanent" : "Contract",
          careerStartDate: employeeData[0].career_start_date,
          retirementDate: employeeData[0].retirement_date,
          photo: employeeData[0].photo,
          role: employeeData[0].role,
          jobClass: employeeData[0].jobClass,
          salaryScale: employeeData[0].salaryScale,
        },
        documents: documentsByCategory,
        totalDocuments: documents.length,
      },
    });
  } catch (error) {
    console.error("Error fetching employee documents:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to get employee documents from DB
const getEmployeeDocsFromDB = async (employeeId) => {
  const [employee] = await con.query(
    `SELECT e.id, e.full_name, e.nic FROM employee e WHERE e.id = ?`,
    [employeeId]
  );

  if (employee.length === 0) {
    return null;
  }

  const [documents] = await con.query(
    `SELECT ed.id, ed.cloudinary_url, dt.name AS documentTypeName, ed.instance_index
     FROM employee_document ed
     JOIN document_type dt ON ed.fk_document_type_id = dt.id
     WHERE ed.fk_emp_id = ? AND ed.cloudinary_url IS NOT NULL
     ORDER BY dt.name, ed.instance_index`,
    [employeeId]
  );

  return { employee: employee[0], documents };
};

// Download all documents as ZIP
const downloadDocumentsAsZip = async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log("Downloading documents as ZIP for employee:", employeeId);

    const result = await getEmployeeDocsFromDB(employeeId);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const { employee, documents } = result;

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No documents found for this employee",
      });
    }

    // Set response headers for ZIP download
    const sanitizedName = employee.full_name.replace(/[^a-zA-Z0-9]/g, "_");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizedName}_${employee.nic}_documents.zip"`
    );

    // Create archive
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      res.status(500).json({ success: false, message: err.message });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Fetch and add each document to the archive
    for (const doc of documents) {
      try {
        const response = await fetch(doc.cloudinary_url);
        if (response.ok) {
          const buffer = await response.buffer();
          const ext =
            doc.cloudinary_url.split(".").pop().split("?")[0] || "pdf";
          const fileName = `${doc.documentTypeName}${
            doc.instance_index > 1 ? `_${doc.instance_index}` : ""
          }.${ext}`;
          archive.append(buffer, { name: fileName });
        }
      } catch (err) {
        console.error(`Error fetching document ${doc.id}:`, err);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("Error downloading documents as ZIP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Combine all PDFs into one
const downloadCombinedPdf = async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log("Downloading combined PDF for employee:", employeeId);

    const result = await getEmployeeDocsFromDB(employeeId);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const { employee, documents } = result;

    // Filter only PDF documents
    const pdfDocuments = documents.filter(
      (doc) =>
        doc.cloudinary_url &&
        (doc.cloudinary_url.toLowerCase().includes(".pdf") ||
          doc.cloudinary_url.toLowerCase().includes("/pdf"))
    );

    if (pdfDocuments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No PDF documents found for this employee",
      });
    }

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Fetch and merge each PDF
    for (const doc of pdfDocuments) {
      try {
        const response = await fetch(doc.cloudinary_url);
        if (response.ok) {
          const pdfBytes = await response.arrayBuffer();
          try {
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(
              pdf,
              pdf.getPageIndices()
            );
            copiedPages.forEach((page) => mergedPdf.addPage(page));
          } catch (pdfErr) {
            console.error(`Error loading PDF ${doc.id}:`, pdfErr);
          }
        }
      } catch (err) {
        console.error(`Error fetching PDF ${doc.id}:`, err);
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      return res.status(400).json({
        success: false,
        message: "Could not merge any PDF documents",
      });
    }

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();

    // Set response headers
    const sanitizedName = employee.full_name.replace(/[^a-zA-Z0-9]/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizedName}_${employee.nic}_all_documents.pdf"`
    );
    res.setHeader("Content-Length", mergedPdfBytes.length);

    res.send(Buffer.from(mergedPdfBytes));
  } catch (error) {
    console.error("Error downloading combined PDF:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  getEmployeeList,
  getEmployeeDocuments,
  downloadDocumentsAsZip,
  downloadCombinedPdf,
};
