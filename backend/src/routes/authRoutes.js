const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const firebaseAuthMiddleware = require("../middleware/firebaseAuthMiddleware");

const { syncUser } = require("../controllers/authController");

router.get("/me", authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

router.post("/sync-test", (req, res) => {
  res.json({
    success: true,
    message: "SYNC TEST WORKING",
  });
});

router.post("/sync-user", firebaseAuthMiddleware, syncUser);

module.exports = router;
