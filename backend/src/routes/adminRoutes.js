const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getAllSuppliers,
  approveSupplier,
  rejectSupplier,
  getAdminStats,
  getRecentOrders,
} = require("../controllers/adminController");

router.get(
  "/suppliers",
  authMiddleware,
  roleMiddleware("admin"),
  getAllSuppliers,
);

router.patch(
  "/suppliers/:id/approve",
  authMiddleware,
  roleMiddleware("admin"),
  approveSupplier,
);

router.patch(
  "/suppliers/:id/reject",
  authMiddleware,
  roleMiddleware("admin"),
  rejectSupplier,
);

router.get("/stats", authMiddleware, getAdminStats);
router.get("/orders", authMiddleware, roleMiddleware("admin"), getRecentOrders);

module.exports = router;
