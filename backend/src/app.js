// const express = require("express");
// const cors = require("cors");

// const dotenv = require("dotenv");
// const helmet = require("helmet");
// dotenv.config();
// const db = require("./config/db");

// const admin = require("./config/firebaseAdmin");
// console.log("Firebase Admin Initialized");

// db.query("SELECT 1")
//   .then(() => {
//     console.log("MySQL Connected");
//   })
//   .catch((err) => {
//     console.log(err);
//   });

// //const testRoutes = require("./routes/testRoutes");

// const authRoutes = require("./routes/authRoutes");
// const protectedRoutes = require("./routes/protectedRoutes");
// const supplierRoutes = require("./routes/supplierRoutes");
// const adminRoutes = require("./routes/adminRoutes");
// const orderRoutes = require("./routes/orderRoutes");
// const paymentRoutes = require("./routes/paymentRoutes");

// const app = express();

// app.use(
//   cors({
//     origin: ["https://street-link.vercel.app", "http://localhost:8080"],
//     credentials: true,
//   }),
// );
// // app.use(helmet());
// app.use(express.json());

// // app.get("/", (req, res) => {
// //   res.send("VendorGPT Backend Running");
// // });

// //app.use("/api/test", testRoutes);

// app.use("/api/auth", authRoutes);
// app.use("/api/protected", protectedRoutes);
// app.use("/api/suppliers", supplierRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api/orders", orderRoutes);
// app.use("/api/payments", paymentRoutes);

// const PORT = process.env.PORT || 5000;
// console.log("APP JS UPDATED");

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const express = require("express");
const cors = require("cors");

const dotenv = require("dotenv");
const helmet = require("helmet");
dotenv.config();
const db = require("./config/db");

const admin = require("./config/firebaseAdmin");
console.log("Firebase Admin Initialized");

db.query("SELECT 1")
  .then(() => {
    console.log("MySQL Connected");
  })
  .catch((err) => {
    console.log(err);
  });

//const testRoutes = require("./routes/testRoutes");

const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const adminRoutes = require("./routes/adminRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const bidOrderRoutes = require("./routes/bidOrderRoutes");

const app = express();

app.use(
  cors({
    origin: ["https://street-link.vercel.app", "http://localhost:8080"],
    credentials: true,
  }),
);
// app.use(helmet());
app.use(express.json());

// app.get("/", (req, res) => {
//   res.send("VendorGPT Backend Running");
// });

//app.use("/api/test", testRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/bid-orders", bidOrderRoutes);

const PORT = process.env.PORT || 5000;
console.log("APP JS UPDATED");

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
