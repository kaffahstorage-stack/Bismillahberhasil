const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const midtransClient = require("midtrans-client");
const path = require("path");

dotenv.config();

const app = express();

/* ================= LOG ================= */
console.log("🚀 Starting app...");
console.log("PORT:", process.env.PORT);
console.log("FIREBASE:", !!process.env.FIREBASE_KEY_JSON);
console.log("MIDTRANS:", !!process.env.MIDTRANS_SERVER_KEY);

/* ================= MIDDLEWARE ================= */
app.use((req, res, next) => {
  console.log("📩", req.method, req.url);
  next();
});

const corsOptions = {
  origin: "https://www.wirastore.web.id",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.options(/.*/, cors(corsOptions));

/* ================= FIREBASE ================= */
let db = null;

try {
  if (process.env.FIREBASE_KEY_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    db = admin.database();

    console.log("🔥 Firebase OK");
  }
} catch (err) {
  console.error("❌ Firebase ERROR:", err.message);
}

/* ================= MIDTRANS ================= */
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
});

/* ================= ROUTES ================= */
app.get("/ping", (req, res) => {
  res.json({ status: "ok", time: Date.now() });
});

/* Midtransnya kayaknya */
app.get("/api/config", (req, res) => {
  res.json({
    midtrans_client_key: process.env.MIDTRANS_CLIENT_KEY || "Mid-client-jqDXeIjvf3onvJmu",
    is_production: false
  });
});

/* ================= START ================= */
const PORT = process.env.PORT;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 SERVER READY ON PORT:", PORT);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

app.post("/api/create-transaction", async (req, res) => {
  try {
    const { order_id, gross_amount, customer, items } = req.body;

    console.log("🔥 CREATE TRANSACTION HIT:", order_id);

    if (!order_id || !gross_amount) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id,
        gross_amount
      }
    });

    return res.json({
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url
    });

  } catch (err) {
    console.error("❌ Midtrans error:", err.message);
    return res.status(500).json({
      error: "Failed",
      detail: err.message
    });
  }
});
