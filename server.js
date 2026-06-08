console.log("ENV CHECK:", {
  FIREBASE_KEY_JSON: !!process.env.FIREBASE_KEY_JSON,
  FIREBASE_DB: !!process.env.FIREBASE_DATABASE_URL,
  MIDTRANS: !!process.env.MIDTRANS_SERVER_KEY
});
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

const app = express();

/* ===================== CORS (FIX STABLE) ===================== */
const corsOptions = {
  origin: "https://bismillahberhasil-plum.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// handle preflight WITHOUT wildcard crash
app.options(/.*/, cors(corsOptions));

/* ===================== BODY ===================== */
app.use(express.json());

/* ===================== FIREBASE ===================== */
let serviceAccount;

if (!process.env.FIREBASE_KEY_JSON) {
  console.error("❌ FIREBASE_KEY_JSON belum diset!");
  process.exit(1);
}

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
} catch (err) {
  console.error("❌ FIREBASE_KEY_JSON rusak format");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

/* ===================== MIDTRANS ===================== */
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

/* ===================== STATIC FRONTEND ===================== */
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===================== HEALTH CHECK ===================== */
app.get("/ping", (req, res) => {
  res.status(200).send("OK");
});

/* ===================== CREATE TRANSACTION ===================== */
app.post("/api/create-transaction", async (req, res) => {
  try {
    const { order_id, gross_amount, customer, items } = req.body;

    if (!order_id || !gross_amount) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const order = {
      order_id,
      gross_amount,
      customer,
      items,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    await db.ref("transactions/" + order_id).set(order);

    const parameter = {
      transaction_details: {
        order_id,
        gross_amount,
      },
      customer_details: {
        first_name: customer?.name || "Customer",
        phone: customer?.phone || "",
        shipping_address: {
          address: customer?.address || "",
        },
      },
      item_details: items.map((i) => ({
        id: i.id,
        name: i.nama,
        price: i.harga,
        quantity: i.quantity,
      })),
    };

    const transaction = await snap.createTransaction(parameter);

    return res.json({
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url,
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return res.status(500).json({
      error: "Failed to create transaction",
      detail: err.message,
    });
  }
});

/* ===================== START SERVER ===================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 SERVER READY ON PORT:", PORT);
});
