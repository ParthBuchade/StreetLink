const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const roleMiddleware = require("../middleware/roleMiddleware");

router.get(
  "/vendor-only",
  authMiddleware,
  roleMiddleware("vendor"),
  (req, res) => {
    res.json({
      success: true,
      message: "Vendor route accessed",
    });
  },
);

router.get(
  "/wholesaler-only",
  authMiddleware,
  roleMiddleware("supplier"),
  (req, res) => {
    res.json({
      success: true,
      message: "Supplier route accessed",
    });
  },
);

router.get(
  "/admin-only",
  authMiddleware,
  roleMiddleware("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Admin route accessed",
    });
  },
);

module.exports = router;
