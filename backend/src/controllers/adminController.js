const db = require("../config/db");

// ─────────────────────────────────────────────────────────────
// GET ALL SUPPLIERS (with user details)
// GET /api/admin/suppliers
// ─────────────────────────────────────────────────────────────
const getAllSuppliers = async (req, res) => {
  try {
    const [suppliers] = await db.query(`
      SELECT
        suppliers.*,
        users.name,
        users.email
      FROM suppliers
      JOIN users ON suppliers.user_id = users.id
      ORDER BY suppliers.created_at DESC
    `);

    return res.json({ success: true, suppliers });
  } catch (error) {
    console.error("GET SUPPLIERS ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch suppliers" });
  }
};

// ─────────────────────────────────────────────────────────────
// APPROVE SUPPLIER
// PATCH /api/admin/suppliers/:id/approve
// ─────────────────────────────────────────────────────────────
const approveSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE suppliers SET verification_status = 'verified' WHERE id = ?`,
      [id],
    );
    return res.json({ success: true, message: "Supplier approved" });
  } catch (error) {
    console.error("APPROVE SUPPLIER ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to approve supplier" });
  }
};

// ─────────────────────────────────────────────────────────────
// REJECT SUPPLIER
// PATCH /api/admin/suppliers/:id/reject
// ─────────────────────────────────────────────────────────────
const rejectSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE suppliers SET verification_status = 'rejected' WHERE id = ?`,
      [id],
    );
    return res.json({ success: true, message: "Supplier rejected" });
  } catch (error) {
    console.error("REJECT SUPPLIER ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to reject supplier" });
  }
};

// ─────────────────────────────────────────────────────────────
// SUSPEND SUPPLIER  ← NEW
// PATCH /api/admin/suppliers/:id/suspend
// ─────────────────────────────────────────────────────────────
const suspendSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE suppliers SET verification_status = 'suspended' WHERE id = ?`,
      [id],
    );
    return res.json({ success: true, message: "Supplier suspended" });
  } catch (error) {
    console.error("SUSPEND SUPPLIER ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to suspend supplier" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET ADMIN STATS — all 8 queries run in PARALLEL  ← IMPROVED
// GET /api/admin/stats
// ─────────────────────────────────────────────────────────────
const getAdminStats = async (req, res) => {
  try {
    const [
      [users],
      [vendors],
      [suppliers],
      [orders],
      [revenue],
      [pending],
      [delivered],
      [pendingCOD],
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) AS totalUsers FROM users`),
      db.query(
        `SELECT COUNT(*) AS totalVendors FROM users WHERE role = 'vendor'`,
      ),
      db.query(`SELECT COUNT(*) AS totalSuppliers FROM suppliers`),
      db.query(`SELECT COUNT(*) AS totalOrders FROM orders`),
      db.query(`
        SELECT IFNULL(SUM(total_amount), 0) AS totalRevenue
        FROM orders
        WHERE payment_status = 'paid'
      `),
      db.query(`
        SELECT COUNT(*) AS pendingVerifications
        FROM suppliers
        WHERE verification_status = 'pending'
      `),
      db.query(`
        SELECT COUNT(*) AS deliveredOrders
        FROM orders
        WHERE order_status = 'delivered'
      `),
      db.query(`
        SELECT COUNT(*) AS pendingCOD
        FROM orders
        WHERE payment_method = 'cod'
          AND payment_status = 'pending'
      `),
    ]);

    return res.json({
      success: true,
      stats: {
        totalUsers: users[0].totalUsers,
        totalVendors: vendors[0].totalVendors,
        totalSuppliers: suppliers[0].totalSuppliers,
        totalOrders: orders[0].totalOrders,
        totalRevenue: revenue[0].totalRevenue,
        pendingVerifications: pending[0].pendingVerifications,
        deliveredOrders: delivered[0].deliveredOrders,
        pendingCOD: pendingCOD[0].pendingCOD,
      },
    });
  } catch (error) {
    console.error("ADMIN STATS ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch admin stats" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET RECENT ORDERS — removed LIMIT 10, added index hint  ← IMPROVED
// GET /api/admin/orders
// ─────────────────────────────────────────────────────────────
const getRecentOrders = async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT
        o.id,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.created_at,
        vendor.name    AS vendor_name,
        supplier.business_name
      FROM orders o
      JOIN users vendor     ON o.customer_id = vendor.id
      JOIN suppliers supplier ON o.supplier_id = supplier.id
      ORDER BY o.created_at DESC
      LIMIT 50
    `);

    return res.json({ success: true, orders });
  } catch (error) {
    console.error("RECENT ORDERS ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch orders" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET WEEKLY REVENUE — for the area chart  ← NEW
// GET /api/admin/weekly-revenue
// Returns last 7 days of orders grouped by day
// ─────────────────────────────────────────────────────────────
const getWeeklyRevenue = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        DATE(created_at)                AS day,
        DAYNAME(created_at)             AS day_name,
        COUNT(*)                        AS orders,
        IFNULL(SUM(total_amount), 0)    AS revenue
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at), DAYNAME(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    return res.json({ success: true, weeklyRevenue: rows });
  } catch (error) {
    console.error("WEEKLY REVENUE ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch weekly revenue" });
  }
};

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
module.exports = {
  getAllSuppliers,
  approveSupplier,
  rejectSupplier,
  suspendSupplier, // ← new
  getAdminStats,
  getRecentOrders,
  getWeeklyRevenue, // ← new
};
