import con from "../config/db.config.js";
import cloudinary from "../config/cloudinary.config.js";

// Helper function to extract public_id from Cloudinary URL
const extractPublicId = (cloudinaryUrl) => {
  if (!cloudinaryUrl) return null;
  try {
    // Cloudinary URLs format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    const urlParts = cloudinaryUrl.split("/");
    const uploadIndex = urlParts.indexOf("upload");
    if (uploadIndex === -1) return null;

    // Get everything after 'upload' and version (v1234567890)
    const pathAfterUpload = urlParts.slice(uploadIndex + 1);
    // Remove version if present (starts with 'v' followed by numbers)
    const startIndex = pathAfterUpload[0]?.match(/^v\d+$/) ? 1 : 0;
    const publicIdWithExt = pathAfterUpload.slice(startIndex).join("/");

    // Remove file extension
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
    return publicId;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
};

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (cloudinaryUrl) => {
  const publicId = extractPublicId(cloudinaryUrl);
  if (!publicId) return;

  try {
    // Try deleting as image first, then as raw (for PDFs)
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    console.log(`Deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      console.log(`Deleted from Cloudinary (raw): ${publicId}`);
    } catch (err) {
      console.error(`Failed to delete from Cloudinary: ${publicId}`, err);
    }
  }
};

const getAdditionalInfo = async (req, res) => {
  try {
    // First, get all active document types
    const [allDocTypes] = await con.query(
      `SELECT id FROM document_type WHERE is_active = 1`,
    );
    const requiredDocTypeIds = allDocTypes.map((dt) => dt.id);

    const [employees] = await con.query(
      `SELECT e.id, e.full_name AS employeeName, e.name_with_init, e.nic AS employeeNIC, 
              e.address, e.dob, e.gender, e.marital_status, e.email, e.phone1, e.phone2,
              e.permanent_status, e.career_start_date, e.retirement_date, e.photo,
              jr.name AS role
       FROM employee e
       LEFT JOIN employee_career ec ON e.id = ec.fk_emp_id AND ec.end_date IS NULL
       LEFT JOIN job_role_class jrc ON ec.fk_job_role_class_id = jrc.id
       LEFT JOIN job_role jr ON jrc.fk_job_role_id = jr.id
       WHERE EXISTS (SELECT 1 FROM employee_document ed WHERE ed.fk_emp_id = e.id)
       ORDER BY e.id DESC`,
    );

    const employeeData = await Promise.all(
      employees.map(async (emp) => {
        const [docs] = await con.query(
          `SELECT id, fk_document_type_id, page_count, cloudinary_url, instance_index, uploaded_at
           FROM employee_document
           WHERE fk_emp_id = ?
           ORDER BY fk_document_type_id, instance_index`,
          [emp.id],
        );

        // Check file health: all required document types must have page_count > 0
        const docTypeIdsWithPages = docs
          .filter((doc) => doc.page_count && doc.page_count > 0)
          .map((doc) => doc.fk_document_type_id);

        const uniqueDocTypeIds = [...new Set(docTypeIdsWithPages)];
        const missingDocTypes = requiredDocTypeIds.filter(
          (reqId) => !uniqueDocTypeIds.includes(reqId),
        );

        const isFileHealthy = missingDocTypes.length === 0;

        return {
          id: emp.id,
          employeeName: emp.employeeName,
          nameWithInit: emp.name_with_init,
          employeeNIC: emp.employeeNIC,
          address: emp.address,
          dob: emp.dob,
          gender: emp.gender,
          mStatus: emp.marital_status,
          email: emp.email,
          phone1: emp.phone1,
          phone2: emp.phone2,
          permanentStatus:
            emp.permanent_status === "P" ? "Permanent" : "Contract",
          careerStartDate: emp.career_start_date,
          retirementDate: emp.retirement_date,
          role: emp.role,
          photo: emp.photo,
          documentCount: docs.length,
          documents: docs,
          lastUpdated: docs.length > 0 ? docs[0].uploaded_at : null,
          isFileHealthy,
          missingDocumentTypes: missingDocTypes.length,
          employee: {
            id: emp.id,
            name: emp.employeeName,
            nic: emp.employeeNIC,
            photo: emp.photo,
          },
        };
      }),
    );

    res.status(200).json({ success: true, data: employeeData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addAdditionalInfo = async (req, res) => {
  try {
    console.log("\n========== ADD ADDITIONAL INFO CALLED ==========");
    console.log("Timestamp:", new Date().toISOString());

    const { employeeId, documentData } = req.body;

    console.log("Employee ID:", employeeId);
    console.log("Document Data keys:", Object.keys(documentData || {}));
    console.log("Full Document Data:", JSON.stringify(documentData, null, 2));

    if (!employeeId || !documentData) {
      console.log("ERROR: Missing required fields");
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    let insertedCount = 0;

    for (const [docTypeId, docInfo] of Object.entries(documentData)) {
      console.log(`\n--- Processing docTypeId: ${docTypeId} ---`);
      const instances = docInfo.instances || [];
      console.log(`Instances array length: ${instances.length}`);

      if (instances.length === 0) {
        console.log(`No instances for docType ${docTypeId} - SKIPPING`);
        continue;
      }

      console.log(
        `Getting max index for empId=${employeeId}, docTypeId=${docTypeId}`,
      );
      const [[{ maxIndex }]] = await con.query(
        "SELECT COALESCE(MAX(instance_index), 0) AS maxIndex FROM employee_document WHERE fk_emp_id = ? AND fk_document_type_id = ?",
        [employeeId, docTypeId],
      );
      console.log(`Max index result: ${maxIndex}`);

      for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];

        console.log(`\n  Instance ${i}:`, JSON.stringify(instance, null, 2));

        // Skip if both page number and file are missing
        if (
          (!instance.pageNumber || instance.pageNumber.trim() === "") &&
          !instance.file
        ) {
          console.log(`  ❌ Skipping - no page number and no file`);
          continue;
        }

        const page = parseInt(instance.pageNumber);
        if (!page || isNaN(page)) {
          console.log(`  ❌ Invalid page number: ${instance.pageNumber}`);
          return res.status(400).json({
            success: false,
            message: `Page number is required for document type ${docTypeId}`,
          });
        }

        const cloudinaryUrl = instance.file?.url || null;
        const insertParams = [
          employeeId,
          docTypeId,
          maxIndex + i + 1,
          page,
          cloudinaryUrl,
        ];

        console.log(`  ✓ Ready to insert:`, insertParams);

        const [result] = await con.query(
          "INSERT INTO employee_document (fk_emp_id, fk_document_type_id, instance_index, page_count, cloudinary_url) VALUES (?, ?, ?, ?, ?)",
          insertParams,
        );

        console.log(`  ✓ Insert result:`, result);
        console.log(`  ✓ Inserted ID:`, result.insertId);
        insertedCount++;
      }
    }

    console.log(`\n✓✓✓ Total documents inserted: ${insertedCount} ✓✓✓`);
    console.log("========== END ADD ADDITIONAL INFO ==========\n");

    res.status(201).json({
      success: true,
      message: "Document info added successfully",
      insertedCount,
    });
  } catch (error) {
    console.error("Error in addAdditionalInfo:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAdditionalInfo = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const { documentData } = req.body;

    console.log("=== Update Additional Info ===");
    console.log("Employee ID:", employeeId);
    console.log("Document Data:", JSON.stringify(documentData, null, 2));

    await con.query("DELETE FROM employee_document WHERE fk_emp_id = ?", [
      employeeId,
    ]);

    let insertedCount = 0;

    for (const [docTypeId, docInfo] of Object.entries(documentData)) {
      const instances = docInfo.instances || [];

      for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];

        console.log(`DocType ${docTypeId}, Instance ${i}:`, instance);

        // Skip if both page number and file are missing
        if (
          (!instance.pageNumber || instance.pageNumber.trim() === "") &&
          !instance.file
        ) {
          console.log(
            `Skipping - no page number and no file for docType ${docTypeId}, instance ${i}`,
          );
          continue;
        }

        const page = parseInt(instance.pageNumber);
        if (!page || isNaN(page)) {
          console.log(
            `Invalid page number for docType ${docTypeId}:`,
            instance.pageNumber,
          );
          return res.status(400).json({
            success: false,
            message: `Page number is required for document type ${docTypeId}`,
          });
        }

        const cloudinaryUrl = instance.file?.url || null;

        console.log(
          `Inserting: empId=${employeeId}, docType=${docTypeId}, index=${
            i + 1
          }, pages=${page}, url=${cloudinaryUrl}`,
        );

        await con.query(
          "INSERT INTO employee_document (fk_emp_id, fk_document_type_id, instance_index, page_count, cloudinary_url) VALUES (?, ?, ?, ?, ?)",
          [employeeId, docTypeId, i + 1, page, cloudinaryUrl],
        );

        insertedCount++;
      }
    }

    console.log(`Total documents updated: ${insertedCount}`);

    res.status(200).json({
      success: true,
      message: "Document info updated successfully",
      insertedCount,
    });
  } catch (error) {
    console.error("Error in updateAdditionalInfo:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAdditionalInfo = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    // First, get all document URLs for this employee to delete from Cloudinary
    const [documents] = await con.query(
      "SELECT cloudinary_url FROM employee_document WHERE fk_emp_id = ? AND cloudinary_url IS NOT NULL",
      [employeeId],
    );

    // Delete from Cloudinary in parallel
    console.log(
      `Deleting ${documents.length} files from Cloudinary for employee ${employeeId}`,
    );
    const deletePromises = documents.map((doc) =>
      deleteFromCloudinary(doc.cloudinary_url),
    );
    await Promise.allSettled(deletePromises);

    // Delete from database
    await con.query("DELETE FROM employee_document WHERE fk_emp_id = ?", [
      employeeId,
    ]);

    res.status(200).json({
      success: true,
      message: "Document info deleted successfully",
      deletedCount: documents.length,
    });
  } catch (error) {
    console.error("Error deleting employee documents:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const documentId = req.params.documentId;

    // First, get the Cloudinary URL for this document
    const [documents] = await con.query(
      "SELECT cloudinary_url FROM employee_document WHERE id = ?",
      [documentId],
    );

    // Delete from Cloudinary if URL exists
    if (documents.length > 0 && documents[0].cloudinary_url) {
      await deleteFromCloudinary(documents[0].cloudinary_url);
    }

    // Delete from database
    await con.query("DELETE FROM employee_document WHERE id = ?", [documentId]);
    res
      .status(200)
      .json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  getAdditionalInfo,
  addAdditionalInfo,
  updateAdditionalInfo,
  deleteAdditionalInfo,
  deleteDocument,
};
