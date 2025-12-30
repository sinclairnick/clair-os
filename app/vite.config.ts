import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			strategies: "injectManifest",
			srcDir: "src",
			filename: "sw.ts",
			registerType: "autoUpdate",
			includeAssets: ["favicon.ico", "apple-touch-icon.png"],
			manifest: {
				name: "ClairOS - Family Home",
				short_name: "ClairOS",
				description: "Your family operations system",
				theme_color: "#d4a574",
				background_color: "#faf8f5",
				display: "standalone",
				orientation: "portrait-primary",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			injectManifest: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
			},
			devOptions: {
				enabled: true,
				type: "module",
			},
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					"vendor-react": ["react", "react-dom", "react-router"],
					"vendor-utils": ["lucide-react", "date-fns", "clsx", "tailwind-merge"],
					"vendor-ui": ["@atlaskit/pragmatic-drag-and-drop", "@base-ui/react", "@tanstack/react-query"],
				},
			},
		},
		chunkSizeWarningLimit: 1000,
	},
	server: {
		proxy: {
			"/api": {
				target: process.env.VITE_PROXY_TARGET || "http://api:3001",
				changeOrigin: true,
			},
		},
	},
});
