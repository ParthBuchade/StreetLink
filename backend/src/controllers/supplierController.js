const db = require("../config/db");

const createSupplierProfile = async (req, res) => {
  try {
    const {
      business_name,
      gst_number,
      pan_number,
      aadhaar_number,
      address,
      bank_details,
    } = req.body;

    const userId = req.user.id;

    const [existingSupplier] = await db.query(
      "SELECT * FROM suppliers WHERE user_id = ?",
      [userId],
    );

    if (existingSupplier.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Supplier profile already exists",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO suppliers
      (
        user_id,
        business_name,
        gst_number,
        pan_number,
        aadhaar_number,
        address,
        bank_details,
        verification_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        business_name,
        gst_number,
        pan_number,
        aadhaar_number,
        address,
        bank_details,
        "pending",
      ],
    );

    return res.json({
      success: true,
      message: "Supplier onboarding submitted",
      supplierId: result.insertId,
    });
  } catch (error) {
    console.log("SUPPLIER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Supplier onboarding failed",
      error: error.message,
    });
  }
};

const getSupplierProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [suppliers] = await db.query(
      "SELECT * FROM suppliers WHERE user_id = ?",
      [userId],
    );

    if (suppliers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier profile not found",
      });
    }

    return res.json({
      success: true,
      supplier: suppliers[0],
    });
  } catch (error) {
    console.log("GET SUPPLIER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch supplier profile",
      error: error.message,
    });
  }
};

module.exports = {
  createSupplierProfile,
  getSupplierProfile,
};