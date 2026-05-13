import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { adminRouter } from "./routers/Admin.route.js";
import productRouter from "./routers/product.Route.js";
import supplierRouter from "./routers/supplier.Route.js";
import purchaseRouter from "./routers/purchase.Route.js";
import saleRouter from "./routers/sale.Route.js";
import settingsRouter from "./routers/settings.Route.js";
import autoInitialize from "./db/auto-init.js";

const app = express();
const PORT = process.env.PORT || 3000;
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

app.use("/auth", adminRouter);
app.use("/products", productRouter);
app.use("/suppliers", supplierRouter);
app.use("/purchases", purchaseRouter);
app.use("/sales", saleRouter);
app.use("/settings", settingsRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

autoInitialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err.message);
    process.exit(1);
  });
