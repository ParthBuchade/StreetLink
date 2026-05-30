const admin = require("../config/firebaseAdmin");

const db = require("../config/db");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = authHeader.split("Bearer ")[1];

    const decodedToken = await admin.auth().verifyIdToken(token);

    const [users] = await db.query(
      "SELECT * FROM users WHERE firebase_uid = ?",
      [decodedToken.uid],
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = users[0];

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: error.message,
    });
  }
};

module.exports = authMiddleware;

// const authMiddleware = async (req, res, next) => {
//   console.log("AUTH MIDDLEWARE HIT");

//   next();
// };

// module.exports = authMiddleware;
