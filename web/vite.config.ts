import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Icônes générées depuis public/icone.svg (voir pwa-assets.config.ts).
      pwaAssets: { config: true },
      manifest: {
        name: "PainR&D · Livret de recettes",
        short_name: "PainR&D",
        description: "Livret de recettes amendable : essais, versions et fournées en photos.",
        lang: "fr",
        theme_color: "#F1F2EE",
        background_color: "#F1F2EE",
        display: "standalone",
        start_url: "/",
      },
      workbox: {
        // L'API et l'administration PocketBase ne passent jamais par le cache de l'app.
        navigateFallbackDenylist: [/^\/api\//, /^\/_\//],
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      },
    }),
  ],
  server: {
    // En développement, PocketBase tourne à côté sur le port 8090.
    proxy: {
      "/api": "http://127.0.0.1:8090",
      "/_": "http://127.0.0.1:8090",
    },
  },
})
