const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const midtransClient = require("midtrans-client");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// ================= FIREBASE INIT =================
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

// ================= MIDTRANS CONFIG =================
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

// ================= ROUTES =================

const path = require("path");

// SERVE FRONTEND
app.use(express.static(path.join(__dirname, "public")));

// homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Create transaction (MIDTRANS)
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

    const parameter = {
      transaction_details: {
        order_id,
        gross_amount,
      },
      customer_details: {
        first_name: customer.name,
        phone: customer.phone,
        shipping_address: {
          address: customer.address,
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

    res.json({
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to create transaction",
      detail: err.message,
    });
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`WiraStore server running on port ${PORT}`);
});
app.get("/api/config", (req, res) => {
  res.json({
    midtrans_client_key: process.env.MIDTRANS_CLIENT_KEY,
  });
});
app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "success.html"));
});