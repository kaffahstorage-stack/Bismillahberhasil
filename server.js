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
  origin: "https://bismillahberhasil-plum.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
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
  console.log("❌ Firebase error:", err.message);
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

/* ================= START ================= */
const PORT = process.env.PORT || 3000;

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log("🚀 SERVER READY ON PORT:", process.env.PORT);
});
