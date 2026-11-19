import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createOriginPolicy } from "./utils/originPolicy.js";
import connectDB, { isDatabaseReady } from "./config/db.js";
import SecondYearRepOTP from "./models/SecondYearRepOTP.js";
import SecondYearRepresentativeApplication from "./models/SecondYearRepresentativeApplication.js";
import { seedAdminUser } from "./utils/seedAdmin.js";
import { seedEmailTemplates } from "./utils/seedEmailTemplates.js";
import { ensureRegistrationAdmissionNoIndex } from "./utils/ensureIndexes.js";

// Route Imports
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import usersPublicRoutes from "./routes/usersPublicRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import checkinRoutes from "./routes/checkinRoutes.js";
import eventsPublicRoutes from "./routes/eventsPublicRoutes.js";
import firstYearRepRoutes from "./routes/firstYearRepRoutes.js";
import secondYearRepRoutes from "./routes/secondYearRepRoutes.js";

dotenv.config();
await connectDB();
await Promise.all([
  SecondYearRepOTP.init(), SecondYearRepresentativeApplication.init(),
  ensureRegistrationAdmissionNoIndex(), seedAdminUser(), seedEmailTemplates(),
]);

const app = express();

const allowOrigin = createOriginPolicy(process.env);
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowOrigin(origin)) return callback(null, true);
      callback(Object.assign(new Error("Origin is not allowed"), { status: 403 }));
    },
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    maxAge: 86400, // Cache preflight for 24 hours
  }),
);

app.use("/api/admin/auth", express.json({ limit: "16kb" }));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Swagger (OpenAPI)
let openApiSpec;

const SWAGGER_UI_DIST_VERSION = "5.31.0";
const SWAGGER_CSS_URL = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_DIST_VERSION}/swagger-ui.css`;
const SWAGGER_BUNDLE_URL = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_DIST_VERSION}/swagger-ui-bundle.js`;
const SWAGGER_STANDALONE_URL = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_DIST_VERSION}/swagger-ui-standalone-preset.js`;

const renderSwaggerUiHtml = ({ basePath, specUrl, title }) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="${SWAGGER_CSS_URL}" />
    <style>
      html, body { height: 100%; margin: 0; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${SWAGGER_BUNDLE_URL}" crossorigin="anonymous"></script>
    <script src="${SWAGGER_STANDALONE_URL}" crossorigin="anonymous"></script>
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

app.get(["/api-docs.json", "/api/api-docs.json"], async (req, res, next) => {
  try {
    const { buildOpenApiSpec } = await import("./config/swagger.js");
    openApiSpec ??= buildOpenApiSpec();
    res.set("Cache-Control", "no-store").json(openApiSpec);
  } catch (error) {
    next(error);
  }
});
app.get(["/docs", "/api-docs"], (req, res) => {
  res.set("Cache-Control", "no-store");
  res.type("html").send(
    renderSwaggerUiHtml({
      basePath: "/api-docs",
      specUrl: "/api-docs.json",
      title: "IEDC Ecosystem API Docs",
    }),
  );
});

// Aliases (useful when deploying behind a proxy that forwards only /api/*)
app.get(["/api/api-docs", "/api/api-docs/"], (req, res) => {
  res.set("Cache-Control", "no-store");
  res.type("html").send(
    renderSwaggerUiHtml({
      basePath: "/api/api-docs",
      specUrl: "/api/api-docs.json",
      title: "IEDC Ecosystem API Docs",
    }),
  );
});

// 2. Routes
app.use("/api/admin", (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  next();
}, adminRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/users", usersPublicRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api", checkinRoutes);
app.use("/api", eventsPublicRoutes);
app.use("/api/first-year-representatives", firstYearRepRoutes);
app.use("/api/second-year-representatives", secondYearRepRoutes);

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

app.get("/api/ready", (req, res) => {
  const ready = isDatabaseReady();
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready" });
});

// 3. Global Error Handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = Number(err.status) || 500;
  res.status(status).json({ message: status >= 500 ? "Server error" : err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
