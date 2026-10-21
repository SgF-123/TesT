import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5180, host: "127.0.0.1" },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "radix-vendor",
              test: /node_modules[\\/]@radix-ui[\\/]/,
              priority: 20,
            },
            {
              name: "icon-vendor",
              test: /node_modules[\\/](lucide|lucide-react|morphicons)[\\/]/,
              priority: 10,
            },
            {
              name: "xterm-vendor",
              test: /node_modules[\\/]@xterm[\\/]/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
});
