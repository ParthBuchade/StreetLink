const db = require("../config/db");

// PLACE ORDER
const createOrder = async (req, res) => {
  try {
    const { supplier_id, items, total_amount, payment_method } = req.body;

    const firebaseUid = req.user.firebase_uid;

    // FIND VENDOR
    const [users] = await db.query(
      `
      SELECT *
      FROM users
      WHERE firebase_uid = ?
      `,
      [firebaseUid],
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const vendor = users[0];

    // FIND SUPPLIER USING FIREBASE UID
    const [suppliers] = await db.query(
      `
      SELECT *
      FROM suppliers
      WHERE user_id = (
        SELECT id
        FROM users
        WHERE firebase_uid = ?
      )
      `,
      [supplier_id],
    );

    if (suppliers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const supplier = suppliers[0];

    // CREATE ORDER
    const [orderResult] = await db.query(
      `
        INSERT INTO orders
        (
          customer_id,
          supplier_id,
          total_amount,
          payment_method
        )
        VALUES (?, ?, ?,?)
        `,
      [vendor.id, supplier.id, total_amount, payment_method],
    );

    const orderId = orderResult.insertId;

    // INSERT ORDER ITEMS
    for (const item of items) {
      await db.query(
        `
        INSERT INTO order_items
        (
            order_id,
            product_id,
            product_name,
            quantity,
            price,
            subtotal
        )
        VALUES (?, ?, ?, ?, ?,?)
        `,
        [
          orderId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.price,
          item.subtotal,
        ],
      );
    }

    return res.json({
      success: true,
      message: "Order placed successfully",
      orderId,
    });
  } catch (error) {
    console.log("CREATE ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: error.message,
    });
  }
};

// GET VENDOR ORDERS
const getVendorOrders = async (req, res) => {
  try {
    const firebaseUid = req.user.firebase_uid;

    const [users] = await db.query(
      `
      SELECT *
      FROM users
      WHERE firebase_uid = ?
      `,
      [firebaseUid],
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const vendor = users[0];

    const [orders] = await db.query(
      `
    SELECT

      orders.*,

      order_items.product_name,

      order_items.quantity,

      users.name
      AS wholesaler_name

    FROM orders

    LEFT JOIN order_items
    ON orders.id =
       order_items.order_id

    LEFT JOIN suppliers
    ON orders.supplier_id =
       suppliers.id

    LEFT JOIN users
    ON suppliers.user_id =
       users.id

    WHERE orders.customer_id = ?

    ORDER BY orders.created_at DESC
    `,
      [vendor.id],
    );

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.log("GET VENDOR ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// GET SUPPLIER ORDERS
const getSupplierOrders = async (req, res) => {
  try {
    const firebaseUid = req.user.firebase_uid;

    // FIND SUPPLIER USER
    const [users] = await db.query(
      `
      SELECT *
      FROM users
      WHERE firebase_uid = ?
      `,
      [firebaseUid],
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const user = users[0];

    // FIND SUPPLIER PROFILE
    const [suppliers] = await db.query(
      `
        SELECT *
        FROM suppliers
        WHERE user_id = ?
        `,
      [user.id],
    );

    if (suppliers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Supplier profile not found",
      });
    }

    const supplier = suppliers[0];

    // FETCH ORDERS
    const [orders] = await db.query(
      `
    SELECT

      orders.*,

      users.name
      AS vendor_name,

      vendor_profiles.phone,

      vendor_profiles.address

    FROM orders

    LEFT JOIN users
    ON orders.customer_id =
       users.id

    LEFT JOIN vendor_profiles
    ON users.id =
       vendor_profiles.user_id

    WHERE orders.supplier_id = ?

    ORDER BY orders.created_at DESC
    `,
      [supplier.id],
    );

    // FETCH ORDER ITEMS
    for (const order of orders) {
      const [items] = await db.query(
        `
    SELECT

      product_name,

      quantity,

      price,

      subtotal

    FROM order_items

    WHERE order_id = ?
    `,
        [order.id],
      );

      order.items = items;
    }

    console.log(JSON.stringify(orders, null, 2));

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.log("GET SUPPLIER ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch supplier orders",
    });
  }
};

// UPDATE ORDER STATUS
const updateOrderStatus = async (req, res) => {
  try {
    console.log("PATCH ROUTE HIT");
    const { id } = req.params;

    const { status } = req.body;

    // await db.query(
    //   `
    //   UPDATE orders
    //   SET order_status = ?
    //   WHERE id = ?
    //   `,
    //   [status, id],
    // );

    if (status === "delivered") {
      await db.query(
        `
    UPDATE orders
    SET
      order_status = ?,
      delivered_at = NOW()
    WHERE id = ?
    `,
        [status, id],
      );
    } else {
      await db.query(
        `
    UPDATE orders
    SET order_status = ?
    WHERE id = ?
    `,
        [status, id],
      );
    }

    // GET VENDOR FIREBASE UID

    const [orders] = await db.query(
      `
  SELECT
    users.firebase_uid
  FROM orders

  JOIN users
  ON orders.customer_id =
     users.id

  WHERE orders.id = ?
  `,
      [id],
    );

    if (orders.length > 0) {
      const vendorFirebaseUid = orders[0].firebase_uid;

      const admin = require("../config/firebaseAdmin");

      await admin
        .firestore()
        .collection("notifications")
        .add({
          userId: vendorFirebaseUid,

          title: "Order Updated",

          message: `Your order #${id} is now ${status}`,

          isRead: false,

          createdAt: new Date(),
        });
    }

    return res.json({
      success: true,
      message: "Order status updated",
    });
  } catch (error) {
    console.log("UPDATE STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

const markPaymentReceived = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      `
        UPDATE orders
        SET
        payment_status = 'paid',
        paid_at = NOW()
        WHERE id = ?
        `,
      [id],
    );

    return res.json({
      success: true,
      message: "Payment marked as paid",
    });
  } catch (error) {
    console.log("PAYMENT UPDATE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update payment",
    });
  }
};

module.exports = {
  createOrder,
  getVendorOrders,
  getSupplierOrders,
  updateOrderStatus,
  markPaymentReceived,
};
