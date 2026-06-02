const db = require("../config/db");

const syncUser = async (req, res) => {
  console.log(req.body);
  try {
    // const { uid, email, name, role } = req.body;
    const { uid, email, name, role, phone, address } = req.body;

    const [existingUsers] = await db.query(
      "SELECT * FROM users WHERE firebase_uid = ?",
      [uid],
    );

    if (existingUsers.length > 0) {
      return res.json({
        success: true,
        message: "User already exists",
        user: existingUsers[0],
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO users
      (firebase_uid, name, email, role)
      VALUES (?, ?, ?, ?)
      `,
      [uid, name, email, role],
    );

    // if (role === "vendor") {
    //   await db.query(
    //     `
    // INSERT INTO vendor_profiles
    // (
    //   user_id,
    //   phone,
    //   address
    // )
    // VALUES (?, ?, ?)
    // `,
    //     [result.insertId, "", ""],
    //   );
    // }

    if (role === "vendor") {
      await db.query(
        `
INSERT INTO vendor_profiles
(
  user_id,
  phone,
  address
)
VALUES (?, ?, ?)
`,
        [result.insertId, phone || "", address || ""],
      );
    }

    return res.json({
      success: true,
      message: "User synced successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.log("SYNC USER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  syncUser,
};
