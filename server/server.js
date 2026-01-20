import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import { seedAdminUser } from "./utils/seedAdmin.js";
import { seedEmailTemplates } from "./utils/seedEmailTemplates.js";
import { ensureRegistrationAdmissionNoIndex } from "./utils/ensureIndexes.js";
import swaggerUi from "swagger-ui-express";
import { buildOpenApiSpec } from "./config/swagger.js";

// Route Imports
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import usersPublicRoutes from "./routes/usersPublicRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";

dotenv.config();
await connectDB();
await ensureRegistrationAdmissionNoIndex();
await seedAdminUser();
await seedEmailTemplates();

const app = express();

// 1. Advanced CORS Configuration
const allowedOrigins = [
  "https://iedclbscek.in",
  "https://admin.iedclbscek.in",
  "https://portal.iedclbscek.in",
  "https://makerspace.iedclbscek.in",
  "https://dev.iedclbscek.in",
  "http://localhost:5173",  
];

const isAllowedDevLocalhost = (origin) => {
  const o = String(or igin || "");
  return (
    /^http:\/\/localhost:\d+$/.test(o) || /^http:\/\/127\.0\.0\.1:\d+$/.test(o)
  );
};

app.use(
  cors({
    origin: (origin, callback) => {
      const isProd = process.env.NODE_ENV === "production";
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (!isProd && isAllowedDevLocalhost(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Crucial for JWT cookies
  }),
);

app.use(express.json());
app.use(cookieParser());

// Swagger (OpenAPI)
const openApiSpec = buildOpenApiSpec();
const swaggerSetup = swaggerUi.setup(openApiSpec, {
  explorer: true,
  customSiteTitle: "IEDC Ecosystem API Docs",
});

app.get("/api-docs.json", (req, res) => res.json(openApiSpec));
app.use("/api-docs", swaggerUi.serve, swaggerSetup);

// Aliases (useful when deploying behind a proxy that forwards only /api/*)
app.get("/api/api-docs.json", (req, res) => res.json(openApiSpec));
app.use("/api/api-docs", swaggerUi.serve, swaggerSetup);

// 2. Routes
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/users", usersPublicRoutes);
app.use("/api/registrations", registrationRoutes);

// Health
/**
 * @openapi
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Server is healthy
 */
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
