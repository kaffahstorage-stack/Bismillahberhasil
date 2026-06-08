const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const midtransClient = require("midtrans-client");
const path = require("path");

dotenv.config();

console.log("🚀 Starting app...");
console.log("PORT:", process.env.PORT);
console.log("FIREBASE:", !!process.env.FIREBASE_KEY_JSON);
console.log("MIDTRANS:", !!process.env.MIDTRANS_SERVER_KEY);
console.log("FIREBASE RAW LENGTH:", process.env.FIREBASE_KEY_JSON?.length);

const app = express();

/* ================= CORS ================= */
const corsOptions = {
  origin: "https://bismillahberhasil-plum.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// FIX penting: pakai regex, bukan "*"
app.options(/.*/, cors(corsOptions));

/* ================= FIREBASE ================= */
let serviceAccount;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
} catch (err) {
  console.error("❌ Firebase JSON error");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

/* ================= MIDTRANS ================= */
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

/* ================= FRONTEND ================= */
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ================= HEALTH CHECK ================= */
app.get("/ping", (req, res) => {
  res.send("OK");
});

/* ================= API ================= */
app.post("/api/create-transaction", async (req, res) => {
  try {
    const { order_id, gross_amount, customer, items } = req.body;

    const order = {
      order_id,
      gross_amount,
      customer,
      items,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    await db.ref("transactions/" + order_id).set(order);

    const transaction = await snap.createTransaction({
      transaction_details: { order_id, gross_amount },
      customer_details: {
        first_name: customer.name,
        phone: customer.phone,
        shipping_address: { address: customer.address },
      },
      item_details: items.map(i => ({
        id: i.id,
        name: i.nama,
        price: i.harga,
        quantity: i.quantity,
      })),
    });

    res.json({
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url,
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({
      error: "Failed to create transaction",
      detail: err.message,
    });
  }
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 SERVER READY ON PORT:", PORT);
});
