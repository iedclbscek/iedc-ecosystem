import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import { seedAdminUser } from "./utils/seedAdmin.js";
import { seedEmailTemplates } from "./utils/seedEmailTemplates.js";

// Route Imports
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();
await connectDB();
await seedAdminUser();
await seedEmailTemplates();

const app = express();

// 1. Advanced CORS Configuration
const allowedOrigins = [
  "https://iedclbscek.in",
  "https://admin.iedclbscek.in",
  "https://portal.iedclbscek.in",
  "http://localhost:5173", // For local development
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Crucial for JWT cookies
  })
);

app.use(express.json());
app.use(cookieParser());

// 2. Routes
app.use("/api/admin", adminRoutes);

// Health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 3. Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
