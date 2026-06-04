const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  getAllSuppliers,
  approveSupplier,
  rejectSupplier,
  suspendSupplier, // ← new
  getAdminStats,
  getRecentOrders,
  getWeeklyRevenue, // ← new
} = require("../controllers/adminController");

// ── Supplier management ──────────────────────────────────────
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

// NEW: suspend a supplier account
router.patch(
  "/suppliers/:id/suspend",
  authMiddleware,
  roleMiddleware("admin"),
  suspendSupplier,
);

// ── Stats & analytics ────────────────────────────────────────
// FIX: added roleMiddleware — previously any logged-in user could call this
router.get("/stats", authMiddleware, roleMiddleware("admin"), getAdminStats);

router.get("/orders", authMiddleware, roleMiddleware("admin"), getRecentOrders);

// NEW: weekly revenue data for the dashboard chart
router.get(
  "/weekly-revenue",
  authMiddleware,
  roleMiddleware("admin"),
  getWeeklyRevenue,
);

module.exports = router;
