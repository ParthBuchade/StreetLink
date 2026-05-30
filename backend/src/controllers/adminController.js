const db = require("../config/db");

const getAllSuppliers = async (req, res) => {
  try {
    const [suppliers] = await db.query(`
      SELECT
        suppliers.*,
        users.name,
        users.email
      FROM suppliers
      JOIN users
      ON suppliers.user_id = users.id
      ORDER BY suppliers.created_at DESC
    `);

    return res.json({
      success: true,
      suppliers,
    });
  } catch (error) {
    console.log("GET SUPPLIERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers",
    });
  }
};

const approveSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `
      UPDATE suppliers
      SET verification_status = ?
      WHERE id = ?
      `,
      ["verified", id],
    );

    return res.json({
      success: true,
      message: "Supplier approved",
    });
  } catch (error) {
    console.log("APPROVE SUPPLIER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve supplier",
    });
  }
};

const rejectSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `
      UPDATE suppliers
      SET verification_status = ?
      WHERE id = ?
      `,
      ["rejected", id],
    );

    return res.json({
      success: true,
      message: "Supplier rejected",
    });
  } catch (error) {
    console.log("REJECT SUPPLIER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject supplier",
    });
  }
};

// const getAdminStats = async (req, res) => {
//   try {
//     // TOTAL USERS
//     const [users] = await db.query(
//       `
//           SELECT COUNT(*) AS totalUsers
//           FROM users
//           `,
//     );

//     // TOTAL ORDERS
//     const [orders] = await db.query(
//       `
//           SELECT COUNT(*) AS totalOrders
//           FROM orders
//           `,
//     );

//     // TOTAL REVENUE
//     const [revenue] = await db.query(
//       `
//           SELECT
//             IFNULL(
//               SUM(total_amount),
//               0
//             ) AS totalRevenue
//           FROM orders
//           WHERE payment_status = 'paid'
//           `,
//     );

//     // PENDING VERIFICATIONS
//     const [pending] = await db.query(
//       `
//           SELECT COUNT(*)
//           AS pendingVerifications
//           FROM suppliers
//           WHERE verification_status = 'pending'
//           `,
//     );

//     return res.json({
//       success: true,

//       stats: {
//         totalUsers: users[0].totalUsers,

//         totalOrders: orders[0].totalOrders,

//         totalRevenue: revenue[0].totalRevenue,

//         pendingVerifications: pending[0].pendingVerifications,
//       },
//     });
//   } catch (error) {
//     console.log("ADMIN STATS ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch admin stats",
//     });
//   }
// };

const getAdminStats = async (req, res) => {
  try {
    // ======================
    // TOTAL USERS
    // ======================

    const [users] = await db.query(`
        SELECT COUNT(*)
        AS totalUsers
        FROM users
      `);

    // ======================
    // TOTAL VENDORS
    // ======================

    const [vendors] = await db.query(`
        SELECT COUNT(*)
        AS totalVendors
        FROM users
        WHERE role = 'vendor'
      `);

    // ======================
    // TOTAL WHOLESALERS
    // ======================

    const [suppliers] = await db.query(`
        SELECT COUNT(*)
        AS totalSuppliers
        FROM suppliers
      `);

    // ======================
    // TOTAL ORDERS
    // ======================

    const [orders] = await db.query(`
        SELECT COUNT(*)
        AS totalOrders
        FROM orders
      `);

    // ======================
    // TOTAL REVENUE
    // ======================

    const [revenue] = await db.query(`
        SELECT
        IFNULL(
          SUM(total_amount),
          0
        ) AS totalRevenue

        FROM orders

        WHERE payment_status =
        'paid'
      `);

    // ======================
    // PENDING VERIFICATIONS
    // ======================

    const [pending] = await db.query(`
        SELECT COUNT(*)
        AS pendingVerifications

        FROM suppliers

        WHERE verification_status =
        'pending'
      `);

    // ======================
    // DELIVERED ORDERS
    // ======================

    const [delivered] = await db.query(`
        SELECT COUNT(*)
        AS deliveredOrders

        FROM orders

        WHERE order_status =
        'delivered'
      `);

    // ======================
    // PENDING COD
    // ======================

    const [pendingCOD] = await db.query(`
        SELECT COUNT(*)
        AS pendingCOD

        FROM orders

        WHERE payment_method =
        'cod'

        AND payment_status =
        'pending'
      `);

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
    console.log("ADMIN STATS ERROR:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to fetch admin stats",
    });
  }
};

const getRecentOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      `
          SELECT

            o.id,

            o.total_amount,

            o.payment_method,

            o.payment_status,

            o.order_status,

            o.created_at,

            vendor.name
            AS vendor_name,

            supplier.business_name

          FROM orders o

          JOIN users vendor
          ON o.customer_id =
             vendor.id

          JOIN suppliers supplier
          ON o.supplier_id =
             supplier.id

          ORDER BY o.created_at DESC

          LIMIT 10
          `,
    );

    return res.json({
      success: true,

      orders,
    });
  } catch (error) {
    console.log("RECENT ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

module.exports = {
  getAllSuppliers,
  approveSupplier,
  rejectSupplier,
  getAdminStats,
  getRecentOrders,
};
