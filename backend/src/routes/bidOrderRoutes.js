const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const {
  syncBidOrder,
  markBidOrderPaid,
  markBidOrderPaidOnline,
  updateBidOrderStatus,
  getSupplierBidOrders,
  getVendorBidOrders,
  getAdminBidOrders,
} = require("../controllers/bidOrderController");

// ── Sync a bid order from Firestore into MySQL (called on bid acceptance) ────
router.post("/sync", authMiddleware, syncBidOrder);

// ── Vendor: fetch their own bid orders with payment status ───────────────────
router.get("/vendor", authMiddleware, getVendorBidOrders);

// ── Supplier (wholesaler): fetch their incoming bid orders ───────────────────
router.get("/supplier", authMiddleware, getSupplierBidOrders);

// ── Supplier: manually mark a COD bid order payment as received ──────────────
router.patch("/:firestoreBidId/pay", authMiddleware, markBidOrderPaid);

// ── Vendor: confirm online payment after Razorpay success ────────────────────
// (paymentController.verifyPayment also handles this, but this endpoint
//  allows a targeted update when only the firestore_bid_id is known)
router.patch(
  "/:firestoreBidId/pay-online",
  authMiddleware,
  markBidOrderPaidOnline,
);

// ── Supplier: update delivery status (confirmed / shipped / delivered / cancelled) ──
router.patch("/:firestoreBidId/status", authMiddleware, updateBidOrderStatus);

// ── Admin: fetch all bid orders ──────────────────────────────────────────────
router.get(
  "/admin",
  authMiddleware,
  roleMiddleware("admin"),
  getAdminBidOrders,
);

module.exports = router;
