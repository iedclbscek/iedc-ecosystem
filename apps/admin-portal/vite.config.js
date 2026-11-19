import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ["react", "react-dom"] },
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify(
      process.env.VITE_API_URL || (mode === "production" ? "https://api.iedclbscek.in/api" : "http://localhost:5000/api"),
    ),
  },
}));
