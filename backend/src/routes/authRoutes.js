const express = require("express");
const db = require("../config/db");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const firebaseAuthMiddleware = require("../middleware/firebaseAuthMiddleware");

const { syncUser } = require("../controllers/authController");

router.get("/me", authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

router.post("/sync-test", (req, res) => {
  res.json({
    success: true,
    message: "SYNC TEST WORKING",
  });
});

router.post("/sync-user", firebaseAuthMiddleware, syncUser);

router.post("/sync-user", firebaseAuthMiddleware, syncUser);

// ✅ ADD THIS — vendor profile update route
router.patch("/vendor-profile", authMiddleware, async (req, res) => {
  try {
    const { phone, address } = req.body;
    const userId = req.user.id;

    await db.query(
      `UPDATE vendor_profiles SET phone = ?, address = ? WHERE user_id = ?`,
      [phone, address, userId],
    );

    return res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.log("UPDATE VENDOR PROFILE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
});

// ✅ Also add db require at the top of this file
module.exports = router;

module.exports = router;
