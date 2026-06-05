const db = require("../config/db");

// ─────────────────────────────────────────────────────────────
// SYNC BID ORDER FROM FIRESTORE → MySQL
// POST /api/bid-orders/sync
// Called by the frontend when a bid is accepted (direct or counter)
// ─────────────────────────────────────────────────────────────
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
    } = req.body;

    // Resolve vendor MySQL id
    const [vendorRows] = await db.query(
      `SELECT id FROM users WHERE firebase_uid = ?`,
      [vendor_firebase_uid],
    );
    if (vendorRows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    const vendor_id = vendorRows[0].id;

    // Resolve supplier MySQL id via wholesaler firebase uid
    const [supplierRows] = await db.query(
      `SELECT suppliers.id FROM suppliers
       JOIN users ON suppliers.user_id = users.id
       WHERE users.firebase_uid = ?`,
      [supplier_firebase_uid],
    );
    if (supplierRows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    const supplier_id = supplierRows[0].id;

    // Upsert (ignore duplicate firestore_bid_id)
    const [result] = await db.query(
      `INSERT INTO bid_orders
         (firestore_bid_id, firestore_order_id, vendor_id, supplier_id,
          product_name, quantity, price_per_unit, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         firestore_order_id = VALUES(firestore_order_id),
         total_amount       = VALUES(total_amount)`,
      [
        firestore_bid_id,
        firestore_order_id,
        vendor_id,
        supplier_id,
        product_name,
        quantity,
        price_per_unit,
        total_amount,
      ],
    );

    return res.json({ success: true, id: result.insertId || null });
  } catch (error) {
    console.error("SYNC BID ORDER ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to sync bid order" });
  }
};

// ─────────────────────────────────────────────────────────────
// MARK BID ORDER AS PAID
// PATCH /api/bid-orders/:firestoreBidId/pay
// Called by frontend after Razorpay success OR manual COD confirmation
// ─────────────────────────────────────────────────────────────
const markBidOrderPaid = async (req, res) => {
  try {
    const { firestoreBidId } = req.params;

    await db.query(
      `UPDATE bid_orders
       SET payment_status = 'paid', paid_at = NOW()
       WHERE firestore_bid_id = ?`,
      [firestoreBidId],
    );

    return res.json({ success: true, message: "Bid order marked as paid" });
  } catch (error) {
    console.error("MARK BID PAID ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update payment" });
  }
};

// ─────────────────────────────────────────────────────────────
// UPDATE BID ORDER STATUS  (delivered / shipped / cancelled)
// PATCH /api/bid-orders/:firestoreBidId/status
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// GET BID ORDERS FOR SUPPLIER  (wholesaler dashboard)
// GET /api/bid-orders/supplier
// ─────────────────────────────────────────────────────────────
const getSupplierBidOrders = async (req, res) => {
  try {
    const firebaseUid = req.user.firebase_uid;

    const [supplierRows] = await db.query(
      `SELECT suppliers.id FROM suppliers
       JOIN users ON suppliers.user_id = users.id
       WHERE users.firebase_uid = ?`,
      [firebaseUid],
    );
    if (supplierRows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    const supplier_id = supplierRows[0].id;

    const [rows] = await db.query(
      `SELECT
         bo.*,
         u.name  AS vendor_name,
         vp.phone AS vendor_phone,
         vp.address AS vendor_address
       FROM bid_orders bo
       JOIN users u   ON bo.vendor_id   = u.id
       LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
       WHERE bo.supplier_id = ?
       ORDER BY bo.created_at DESC`,
      [supplier_id],
    );

    return res.json({ success: true, bidOrders: rows });
  } catch (error) {
    console.error("GET SUPPLIER BID ORDERS ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch bid orders" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET ALL BID ORDERS  (admin panel)
// GET /api/bid-orders/admin
// ─────────────────────────────────────────────────────────────
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
  updateBidOrderStatus,
  getSupplierBidOrders,
  getAdminBidOrders,
};
