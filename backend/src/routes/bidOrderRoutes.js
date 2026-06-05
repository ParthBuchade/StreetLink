const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  syncBidOrder,
  markBidOrderPaid,
  updateBidOrderStatus,
  getSupplierBidOrders,
  getAdminBidOrders,
} = require("../controllers/bidOrderController");

// Sync a bid order from Firestore into MySQL (called on bid acceptance)
router.post("/sync", authMiddleware, syncBidOrder);

// Supplier: fetch their own bid orders
router.get("/supplier", authMiddleware, getSupplierBidOrders);

// Supplier: mark a bid order as paid
router.patch("/:firestoreBidId/pay", authMiddleware, markBidOrderPaid);

// Supplier: update status (delivered, shipped, etc.)
router.patch("/:firestoreBidId/status", authMiddleware, updateBidOrderStatus);

// Admin: fetch all bid orders
router.get(
  "/admin",
  authMiddleware,
  roleMiddleware("admin"),
  getAdminBidOrders,
);

module.exports = router;
