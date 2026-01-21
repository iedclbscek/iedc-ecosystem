import swaggerJSDoc from "swagger-jsdoc";
import path from "path";
import { fileURLToPath } from "url";

const isProd = process.env.NODE_ENV === "production";

const serverUrl =
  process.env.SWAGGER_SERVER_URL || process.env.PUBLIC_SERVER_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildOpenApiSpec() {
  const servers = [];

  if (serverUrl) {
    servers.push({ url: serverUrl });
  }

  if (!isProd) {
    const port = process.env.PORT || 5000;
    servers.push({ url: `http://localhost:${port}` });
  }

  const options = {
    definition: {
      openapi: "3.0.3",
      info: {
        title: "IEDC Ecosystem API",
        version: "1.0.0",
        description:
          "Swagger docs for the IEDC ecosystem server. Some endpoints require authentication via JWT cookie or Bearer token.",
      },
      servers,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "token",
          },
        },
      },
      tags: [
        { name: "Health" },
        { name: "Check-In" },
        { name: "Admin Auth" },
        { name: "Admin Registrations" },
        { name: "Admin Users" },
        { name: "Admin Website Team" },
        { name: "Admin Clubs" },
        { name: "Admin Events" },
        { name: "Admin Email Templates" },
        { name: "Public" },
        { name: "Registrations" },
      ],
    },
    apis: [
      path.join(__dirname, "../routes/*.js"),
      path.join(__dirname, "../controllers/*.js"),
    ],
  };

  return swaggerJSDoc(options);
}
