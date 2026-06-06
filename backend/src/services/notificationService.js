const db = require("../config/db");

/**
 * Create a notification row in MySQL.
 *
 * @param {object} params
 * @param {string} params.firebase_uid   — recipient's Firebase UID (we look up MySQL user id)
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.type]         — e.g. 'payment', 'order', 'bid', 'delivery'
 */
const createNotification = async ({
  firebase_uid,
  title,
  message,
  type = "general",
}) => {
  const [userRows] = await db.query(
    `SELECT id FROM users WHERE firebase_uid = ?`,
    [firebase_uid],
  );
  if (userRows.length === 0) {
    console.warn(
      `createNotification: no user found for firebase_uid=${firebase_uid}`,
    );
    return;
  }
  const user_id = userRows[0].id;

  await db.query(
    `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
    [user_id, title, message, type],
  );
};

module.exports = { createNotification };
