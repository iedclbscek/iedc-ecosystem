import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import { seedAdminUser } from "./utils/seedAdmin.js";
import { seedEmailTemplates } from "./utils/seedEmailTemplates.js";
import { ensureRegistrationAdmissionNoIndex } from "./utils/ensureIndexes.js";
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
const configuredCookieDomain = String(process.env.COOKIE_DOMAIN || "").trim();
const baseDomain = configuredCookieDomain
  ? configuredCookieDomain.replace(/^[.]/, "")
  : "iedclbscek.in"; // legacy default for existing prod domain
const allowVercelPreview =
  String(process.env.ALLOW_VERCEL_PREVIEW || "true")
    .toLowerCase()
    .trim() !== "false";
const extraAllowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const isAllowedDevLocalhost = (origin) => {
  const o = String(origin || "");
  return (
    /^http:\/\/localhost:\d+$/.test(o) || /^http:\/\/127\.0\.0\.1:\d+$/.test(o)
  );
};

const isAllowedProdOrigin = (origin) => {
  const o = String(origin || "");
  if (!o.startsWith("https://")) return false;
  try {
    const { hostname } = new URL(o);
    if (extraAllowedOrigins.includes(o)) return true;

    const matchesBaseDomain = baseDomain
      ? hostname === baseDomain ||
        hostname === `www.${baseDomain}` ||
        hostname.endsWith(`.${baseDomain}`)
      : false;

    const matchesVercelPreview = allowVercelPreview
      ? hostname.endsWith(".vercel.app")
      : false;

    return matchesBaseDomain || matchesVercelPreview;
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      const isProd = process.env.NODE_ENV === "production";
      if (
        !origin ||
        isAllowedProdOrigin(origin) ||
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

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Swagger (OpenAPI)
const openApiSpec = buildOpenApiSpec();

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

app.get("/api-docs.json", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(openApiSpec);
});
app.get(["/api-docs", "/api-docs/"], (req, res) => {
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
app.get("/api/api-docs.json", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(openApiSpec);
});
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
