const db = require("../config/db");
const { createNotification } = require("../services/notificationService");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — resolve MySQL vendor_id from firebase_uid
// ─────────────────────────────────────────────────────────────────────────────
const resolveVendorId = async (firebase_uid) => {
  const [rows] = await db.query(`SELECT id FROM users WHERE firebase_uid = ?`, [
    firebase_uid,
  ]);
  if (rows.length === 0)
    throw Object.assign(new Error("Vendor not found"), { status: 404 });
  return rows[0].id;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — resolve MySQL supplier_id from wholesaler firebase_uid
// ─────────────────────────────────────────────────────────────────────────────
const resolveSupplierId = async (firebase_uid) => {
  const [rows] = await db.query(
    `SELECT suppliers.id FROM suppliers
     JOIN users ON suppliers.user_id = users.id
     WHERE users.firebase_uid = ?`,
    [firebase_uid],
  );
  if (rows.length === 0)
    throw Object.assign(new Error("Supplier not found"), { status: 404 });
  return rows[0].id;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bid-orders/sync
// Sync a bid order from Firestore → MySQL on bid acceptance (direct or counter).
// Called by frontend (vendor or wholesaler) right after the Firestore write.
// ─────────────────────────────────────────────────────────────────────────────
const syncBidOrder = async (req, res) => {
  try {
    const {
      firestore_bid_id,
      firestore_order_id,
      vendor_firebase_uid,
      supplier_firebase_uid,
      product_name,
      quantity,
      price_per_unit,
      total_amount,
      payment_method = "cod", // default cod; frontend can pass "online"
    } = req.body;

    const vendor_id = await resolveVendorId(vendor_firebase_uid);
    const supplier_id = await resolveSupplierId(supplier_firebase_uid);

    const [result] = await db.query(
      `INSERT INTO bid_orders
         (firestore_bid_id, firestore_order_id, vendor_id, supplier_id,
          product_name, quantity, price_per_unit, total_amount, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         firestore_order_id = VALUES(firestore_order_id),
         total_amount       = VALUES(total_amount),
         payment_method     = VALUES(payment_method)`,
      [
        firestore_bid_id,
        firestore_order_id,
        vendor_id,
        supplier_id,
        product_name,
        quantity,
        price_per_unit,
        total_amount,
        payment_method,
      ],
    );

    // Fetch the row so we can return the MySQL id regardless of insert vs update
    const [rows] = await db.query(
      `SELECT id FROM bid_orders WHERE firestore_bid_id = ?`,
      [firestore_bid_id],
    );

    return res.json({ success: true, id: rows[0]?.id ?? result.insertId });
  } catch (error) {
    console.error("SYNC BID ORDER ERROR:", error);
    return res
      .status(error.status || 500)
      .json({
        success: false,
        message: error.message || "Failed to sync bid order",
      });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bid-orders/:firestoreBidId/pay
// Wholesaler manually marks a COD bid order payment as received.
// ─────────────────────────────────────────────────────────────────────────────
const markBidOrderPaid = async (req, res) => {
  try {
    const { firestoreBidId } = req.params;

    const [rows] = await db.query(
      `SELECT bo.id, bo.vendor_id, bo.product_name, bo.total_amount,
              u.firebase_uid AS vendor_firebase_uid
       FROM bid_orders bo
       JOIN users u ON bo.vendor_id = u.id
       WHERE bo.firestore_bid_id = ?`,
      [firestoreBidId],
    );

    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Bid order not found" });

    const order = rows[0];

    await db.query(
      `UPDATE bid_orders
       SET payment_status = 'paid', paid_at = NOW()
       WHERE firestore_bid_id = ?`,
      [firestoreBidId],
    );

    // Notify the vendor that their payment has been confirmed
    try {
      await createNotification({
        firebase_uid: order.vendor_firebase_uid,
        title: "💳 Payment Confirmed",
        message: `Your payment of ₹${order.total_amount} for bid order (${order.product_name}) has been received by the wholesaler.`,
        type: "payment",
      });
    } catch (notifErr) {
      console.warn(
        "NOTIFY VENDOR PAYMENT ERROR (non-critical):",
        notifErr.message,
      );
    }

    return res.json({ success: true, message: "Bid order marked as paid" });
  } catch (error) {
    console.error("MARK BID PAID ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update payment" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bid-orders/:firestoreBidId/pay-online
// Called by the frontend AFTER Razorpay payment verification succeeds.
// Stores razorpay details and marks the bid order as paid.
// ─────────────────────────────────────────────────────────────────────────────
const markBidOrderPaidOnline = async (req, res) => {
  try {
    const { firestoreBidId } = req.params;
    const { razorpay_order_id, razorpay_payment_id } = req.body;

    const [rows] = await db.query(
      `SELECT bo.id, bo.vendor_id, bo.product_name, bo.total_amount,
              u.firebase_uid AS vendor_firebase_uid
       FROM bid_orders bo
       JOIN users u ON bo.vendor_id = u.id
       WHERE bo.firestore_bid_id = ?`,
      [firestoreBidId],
    );

    if (rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Bid order not found" });

    const order = rows[0];

    await db.query(
      `UPDATE bid_orders
       SET payment_status      = 'paid',
           payment_method      = 'online',
           razorpay_order_id   = ?,
           razorpay_payment_id = ?,
           paid_at             = NOW()
       WHERE firestore_bid_id = ?`,
      [razorpay_order_id, razorpay_payment_id, firestoreBidId],
    );

    // Notify the vendor
    try {
      await createNotification({
        firebase_uid: order.vendor_firebase_uid,
        title: "💳 Online Payment Successful",
        message: `Your online payment of ₹${order.total_amount} for bid order (${order.product_name}) was successful.`,
        type: "payment",
      });
    } catch (notifErr) {
      console.warn(
        "NOTIFY VENDOR ONLINE PAYMENT ERROR (non-critical):",
        notifErr.message,
      );
    }

    return res.json({
      success: true,
      message: "Bid order online payment recorded",
    });
  } catch (error) {
    console.error("MARK BID PAID ONLINE ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to record online payment" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bid-orders/:firestoreBidId/status
// Wholesaler updates delivery status (shipped / delivered / cancelled).
// ─────────────────────────────────────────────────────────────────────────────
const updateBidOrderStatus = async (req, res) => {
  try {
    const { firestoreBidId } = req.params;
    const { status } = req.body;

    const allowed = ["confirmed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });

    if (status === "delivered") {
      await db.query(
        `UPDATE bid_orders SET order_status = ?, delivered_at = NOW() WHERE firestore_bid_id = ?`,
        [status, firestoreBidId],
      );

      // Notify vendor about delivery
      try {
        const [rows] = await db.query(
          `SELECT bo.product_name, u.firebase_uid AS vendor_firebase_uid
           FROM bid_orders bo JOIN users u ON bo.vendor_id = u.id
           WHERE bo.firestore_bid_id = ?`,
          [firestoreBidId],
        );
        if (rows.length > 0) {
          await createNotification({
            firebase_uid: rows[0].vendor_firebase_uid,
            title: "📦 Bid Order Delivered",
            message: `Your bid order for ${rows[0].product_name} has been marked as delivered.`,
            type: "delivery",
          });
        }
      } catch (notifErr) {
        console.warn("NOTIFY DELIVERY ERROR (non-critical):", notifErr.message);
      }
    } else {
      await db.query(
        `UPDATE bid_orders SET order_status = ? WHERE firestore_bid_id = ?`,
        [status, firestoreBidId],
      );
    }

    return res.json({ success: true, message: "Bid order status updated" });
  } catch (error) {
    console.error("UPDATE BID STATUS ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update status" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bid-orders/supplier
// Wholesaler sees all their bid orders (incoming from vendors).
// ─────────────────────────────────────────────────────────────────────────────
const getSupplierBidOrders = async (req, res) => {
  try {
    const firebaseUid = req.user.firebase_uid;
    const supplier_id = await resolveSupplierId(firebaseUid);

    const [rows] = await db.query(
      `SELECT
         bo.*,
         u.name        AS vendor_name,
         vp.phone      AS vendor_phone,
         vp.address    AS vendor_address
       FROM bid_orders bo
       JOIN users u ON bo.vendor_id = u.id
       LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
       WHERE bo.supplier_id = ?
       ORDER BY bo.created_at DESC`,
      [supplier_id],
    );

    return res.json({ success: true, bidOrders: rows });
  } catch (error) {
    console.error("GET SUPPLIER BID ORDERS ERROR:", error);
    return res
      .status(error.status || 500)
      .json({
        success: false,
        message: error.message || "Failed to fetch bid orders",
      });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bid-orders/vendor
// Vendor sees all their own bid orders (what they placed/had accepted).
// Used by VendorPage to show payment status and allow online payment.
// ─────────────────────────────────────────────────────────────────────────────
const getVendorBidOrders = async (req, res) => {
  try {
    const firebaseUid = req.user.firebase_uid;
    const vendor_id = await resolveVendorId(firebaseUid);

    const [rows] = await db.query(
      `SELECT
         bo.*,
         s.business_name AS wholesaler_name,
         u2.name         AS wholesaler_display_name
       FROM bid_orders bo
       JOIN suppliers s ON bo.supplier_id = s.id
       JOIN users u2    ON s.user_id = u2.id
       WHERE bo.vendor_id = ?
       ORDER BY bo.created_at DESC`,
      [vendor_id],
    );

    return res.json({ success: true, bidOrders: rows });
  } catch (error) {
    console.error("GET VENDOR BID ORDERS ERROR:", error);
    return res
      .status(error.status || 500)
      .json({
        success: false,
        message: error.message || "Failed to fetch bid orders",
      });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bid-orders/admin
// Admin panel — all bid orders with vendor + wholesaler names.
// ─────────────────────────────────────────────────────────────────────────────
const getAdminBidOrders = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         bo.*,
         u.name              AS vendor_name,
         s.business_name     AS wholesaler_name
       FROM bid_orders bo
       JOIN users     u  ON bo.vendor_id   = u.id
       JOIN suppliers s  ON bo.supplier_id = s.id
       ORDER BY bo.created_at DESC
       LIMIT 200`,
    );

    return res.json({ success: true, bidOrders: rows });
  } catch (error) {
    console.error("GET ADMIN BID ORDERS ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch bid orders" });
  }
};

module.exports = {
  syncBidOrder,
  markBidOrderPaid,
  markBidOrderPaidOnline,
  updateBidOrderStatus,
  getSupplierBidOrders,
  getVendorBidOrders,
  getAdminBidOrders,
};
