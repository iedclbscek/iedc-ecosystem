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
import checkinRoutes from "./routes/checkinRoutes.js";

dotenv.config();
await connectDB();
await ensureRegistrationAdmissionNoIndex();
await seedAdminUser();
await seedEmailTemplates();

const app = express();

// 1. Advanced CORS Configuration
const allowedOrigins = [
  "https://iedclbscek.in",
  "https://www.iedclbscek.in",
  "https://admin.iedclbscek.in",
  "https://portal.iedclbscek.in",
  "https://makerspace.iedclbscek.in",
  "https://dev.iedclbscek.in",
  "http://localhost:5173",
];

const isAllowedDevLocalhost = (origin) => {
  const o = String(origin || "");
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

const renderSwaggerUiHtml = ({ basePath, specUrl, title }) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="${basePath}/swagger-ui.css" />
    <style>
      html, body { height: 100%; margin: 0; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${basePath}/swagger-ui-bundle.js" crossorigin></script>
    <script src="${basePath}/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: ${JSON.stringify(specUrl)},
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: 'StandaloneLayout'
        });
      };
    </script>
  </body>
</html>`;

app.get("/api-docs.json", (req, res) => res.json(openApiSpec));
app.use("/api-docs", swaggerUi.serve);
app.get(["/api-docs", "/api-docs/"], (req, res) => {
  res.type("html").send(
    renderSwaggerUiHtml({
      basePath: "/api-docs",
      specUrl: "/api-docs.json",
      title: "IEDC Ecosystem API Docs",
    }),
  );
});

// Aliases (useful when deploying behind a proxy that forwards only /api/*)
app.get("/api/api-docs.json", (req, res) => res.json(openApiSpec));
app.use("/api/api-docs", swaggerUi.serve);
app.get(["/api/api-docs", "/api/api-docs/"], (req, res) => {
  res.type("html").send(
    renderSwaggerUiHtml({
      basePath: "/api/api-docs",
      specUrl: "/api/api-docs.json",
      title: "IEDC Ecosystem API Docs",
    }),
  );
});

// 2. Routes
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/users", usersPublicRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api", checkinRoutes);

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
