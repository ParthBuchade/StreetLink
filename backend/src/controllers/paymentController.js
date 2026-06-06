const razorpay = require("../config/razorpay");
const crypto = require("crypto");
const db = require("../config/db");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create-order
// Creates a Razorpay payment order for a given amount.
// Works for both marketplace orders and bid orders — caller decides.
// ─────────────────────────────────────────────────────────────────────────────
const createPaymentOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.json({ success: true, order });
  } catch (error) {
    console.error("CREATE PAYMENT ORDER ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create payment order" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/verify
// Verifies Razorpay signature and updates either:
//   • a marketplace order   (when mysql_order_id is provided), or
//   • a bid order           (when firestore_bid_id is provided)
//
// Body params:
//   razorpay_order_id    — from Razorpay handler response
//   razorpay_payment_id  — from Razorpay handler response
//   razorpay_signature   — from Razorpay handler response
//   mysql_order_id?      — for marketplace orders
//   firestore_bid_id?    — for bid/negotiation orders
// ─────────────────────────────────────────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      mysql_order_id, // marketplace order
      firestore_bid_id, // bid order
    } = req.body;

    // ── Signature verification ──────────────────────────────────────────────
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    // ── Update marketplace order ────────────────────────────────────────────
    if (mysql_order_id) {
      await db.query(
        `UPDATE orders
         SET payment_status = 'paid',
             paid_at        = NOW()
         WHERE id = ?`,
        [mysql_order_id],
      );
      console.log("MARKETPLACE PAYMENT MARKED PAID, order:", mysql_order_id);
    }

    // ── Update bid order ────────────────────────────────────────────────────
    if (firestore_bid_id) {
      await db.query(
        `UPDATE bid_orders
         SET payment_status      = 'paid',
             payment_method      = 'online',
             razorpay_order_id   = ?,
             razorpay_payment_id = ?,
             paid_at             = NOW()
         WHERE firestore_bid_id = ?`,
        [razorpay_order_id, razorpay_payment_id, firestore_bid_id],
      );
      console.log(
        "BID ORDER PAYMENT MARKED PAID, firestore_bid_id:",
        firestore_bid_id,
      );

      // Notify the wholesaler/supplier that vendor has paid online
      try {
        const [rows] = await db.query(
          `SELECT bo.product_name, bo.total_amount,
                  u_supplier.firebase_uid AS supplier_firebase_uid,
                  u_vendor.name           AS vendor_name
           FROM bid_orders bo
           JOIN suppliers s ON bo.supplier_id = s.id
           JOIN users u_supplier ON s.user_id  = u_supplier.id
           JOIN users u_vendor   ON bo.vendor_id = u_vendor.id
           WHERE bo.firestore_bid_id = ?`,
          [firestore_bid_id],
        );
        if (rows.length > 0) {
          const {
            createNotification,
          } = require("../services/notificationService");
          await createNotification({
            firebase_uid: rows[0].supplier_firebase_uid,
            title: "💳 Bid Order Payment Received",
            message: `${rows[0].vendor_name} paid ₹${rows[0].total_amount} online for bid order (${rows[0].product_name}).`,
            type: "payment",
          });
        }
      } catch (notifErr) {
        console.warn(
          "NOTIFY WHOLESALER BID PAYMENT ERROR (non-critical):",
          notifErr.message,
        );
      }
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Payment verification failed" });
  }
};

module.exports = { createPaymentOrder, verifyPayment };
