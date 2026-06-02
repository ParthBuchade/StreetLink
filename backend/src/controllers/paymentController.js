const razorpay = require("../config/razorpay");

const crypto = require("crypto");

const db = require("../config/db");

// CREATE PAYMENT ORDER

const createPaymentOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100,

      currency: "INR",

      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.log("CREATE PAYMENT ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
};

// VERIFY PAYMENT

// const verifyPayment = async (req, res) => {
//   try {
//     const {
//       razorpay_order_id,

//       razorpay_payment_id,

//       razorpay_signature,

//       // mysql_order_id,
//     } = req.body;

//     const body = razorpay_order_id + "|" + razorpay_payment_id;

//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(body.toString())
//       .digest("hex");

//     const isAuthentic = expectedSignature === razorpay_signature;

//     if (!isAuthentic) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payment",
//       });
//     }

//     // UPDATE MYSQL

//     // await db.query(
//     //   `
//     //     UPDATE orders
//     //     SET payment_status = 'paid'
//     //     WHERE id = ?
//     //     `,
//     //   [mysql_order_id],
//     // );

//     return res.json({
//       success: true,
//       message: "Payment verified",
//     });
//   } catch (error) {
//     console.log("VERIFY PAYMENT ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Payment verification failed",
//     });
//   }
// };

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      mysql_order_id, // ✅ accept it now
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment",
      });
    }

    // ✅ UPDATE PAYMENT STATUS IN DB
    if (mysql_order_id) {
      await db.query(
        `UPDATE orders
         SET payment_status = 'paid',
             paid_at = NOW()
         WHERE id = ?`,
        [mysql_order_id],
      );
      console.log("PAYMENT STATUS UPDATED FOR ORDER:", mysql_order_id);
    }

    return res.json({
      success: true,
      message: "Payment verified",
    });
  } catch (error) {
    console.log("VERIFY PAYMENT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
};
