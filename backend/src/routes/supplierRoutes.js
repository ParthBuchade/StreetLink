const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const roleMiddleware = require("../middleware/roleMiddleware");

const {
  createSupplierProfile,
  getSupplierProfile,
} = require("../controllers/supplierController");

router.post(
  "/onboard",
  authMiddleware,
  roleMiddleware("wholesaler"),
  createSupplierProfile,
);

router.get(
  "/me",
  authMiddleware,
  roleMiddleware("wholesaler"),
  getSupplierProfile,
);

module.exports = router;
