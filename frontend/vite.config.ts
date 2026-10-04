import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Two independent entry points, two independent module graphs.
      // admin.html never imports anything from index.html's graph (and
      // vice versa), so the admin panel's routes/components never end up
      // in the public site's JS bundle — see src/AdminApp.tsx.
      input: {
        main: "index.html",
        admin: "admin.html",
      },
    },
  },
});
