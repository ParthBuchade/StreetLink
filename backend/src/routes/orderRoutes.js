const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createOrder,
  getVendorOrders,
  getSupplierOrders,
  updateOrderStatus,
  markPaymentReceived,
} = require("../controllers/orderController");

// PLACE ORDER
router.post("/", authMiddleware, createOrder);

// UPDATE ORDER STATUS
router.patch("/:id", authMiddleware, updateOrderStatus);

// VENDOR ORDERS
router.get("/vendor", authMiddleware, getVendorOrders);

// SUPPLIER ORDERS
router.get("/supplier", authMiddleware, getSupplierOrders);
router.get("/test", (req, res) => {
  res.json({
    success: true,
  });
});
// UPDATE ORDER STATUS
router.patch("/:id/status", authMiddleware, updateOrderStatus);
router.patch("/payment/:id", authMiddleware, markPaymentReceived);

module.exports = router;
