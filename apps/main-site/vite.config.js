import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // Install this via: npm install @tailwindcss/vite

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
});
