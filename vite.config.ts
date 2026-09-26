import { spawnSync } from "node:child_process";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import electron from "vite-plugin-electron/simple";

function electronMainCjsOutputPlugin(): Plugin {
	return {
		name: "recordly-electron-main-cjs-output",
		enforce: "post",
		config(config) {
			// Vite mergeConfig concatenates lib.formats with the plugin's ESM default.
			config.build ??= {};
			const build = config.build;
			const lib = build.lib;
			if (lib && typeof lib === "object") {
				lib.formats = ["cjs"];
				lib.fileName = (_format, entryName) => `${entryName}.cjs`;
			}

			build.rollupOptions ??= {};
			const rollupOptions = build.rollupOptions;
			const cjsOutput = {
				format: "cjs" as const,
				inlineDynamicImports: true,
				entryFileNames: "[name].cjs",
				chunkFileNames: "[name]-[hash].cjs",
			};

			rollupOptions.output = Array.isArray(rollupOptions.output)
				? rollupOptions.output.map((output) => ({ ...output, ...cjsOutput }))
				: { ...(rollupOptions.output ?? {}), ...cjsOutput };
		},
	};
}

function electronMainCjsGuardPlugin(): Plugin {
	return {
		name: "recordly-electron-main-cjs-guard",
		closeBundle() {
			const scriptPath = path.resolve(__dirname, "scripts/smoke-electron-main-cjs.mjs");
			const result = spawnSync(process.execPath, [scriptPath], {
				cwd: __dirname,
				encoding: "utf8",
			});

			if (result.status !== 0) {
				const details = [result.stdout, result.stderr].filter(Boolean).join("\n");
				throw new Error(
					`Electron main CJS smoke failed after Vite build.${details ? `\n${details}` : ""}`,
				);
			}
		},
	};
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	server: {
		watch: {
			usePolling: false,
			interval: 1000,
		},
		hmr: {
			overlay: true,
		},
		fs: {
			strict: false,
		},
	},
	plugins: [
		react(),
		...(mode === "ui" || process.env.RECORDLY_RENDERER_ONLY === "1"
			? []
			: [
					electron({
						main: {
							// Shortcut of `build.lib.entry`.
							entry: "electron/main.ts",
							vite: {
								build: {
									lib: {
										entry: "electron/main.ts",
										formats: ["cjs"],
										fileName: (_format, entryName) => `${entryName}.cjs`,
									},
									rollupOptions: {
										external: ["ffmpeg-static", "uiohook-napi"],
										output: {
											format: "cjs",
											inlineDynamicImports: true,
											entryFileNames: "[name].cjs",
											chunkFileNames: "[name]-[hash].cjs",
										},
									},
								},
								plugins: [
									electronMainCjsOutputPlugin(),
									electronMainCjsGuardPlugin(),
								],
							},
						},
						preload: {
							// Shortcut of `build.rollupOptions.input`.
							// Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
							input: path.join(__dirname, "electron/preload.ts"),
						},
						// Polyfill the Electron and Node.js API for the renderer process.
						// If you want to use Node.js in the renderer process, enable `nodeIntegration` in the main process.
						// See https://github.com/electron-vite/vite-plugin-electron-renderer
						renderer:
							process.env.NODE_ENV === "test"
								? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
									undefined
								: {},
					}),
				]),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	optimizeDeps: {
		entries: ["index.html"],
		exclude: [
			"react-icons/bs",
			"react-icons/fa",
			"react-icons/fa6",
			"react-icons/fi",
			"react-icons/md",
			"react-icons/rx",
		],
		include: [
			"react",
			"react-dom",
			"@heroui/react",
			"motion",
			"pixi.js",
		],
		force: false,
	},
	build: {
		target: "esnext",
		minify: "terser",
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
				pure_funcs: ["console.log", "console.debug"],
			},
		},
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					if (id.includes("node_modules")) {
						if (id.includes("react") || id.includes("react-dom")) {
							return "react-vendor";
						}
						if (id.includes("mediabunny") || id.includes("mp4box") || id.includes("@fix-webm-duration")) {
							return "video-processing";
						}
						if (id.includes("pixi") || id.includes("pixi-filters")) {
							return "graphics";
						}
						if (id.includes("@heroui")) {
							return "ui-components";
						}
						if (id.includes("motion")) {
							return "animations";
						}
						if (id.includes("react-icons")) {
							return "icons";
						}
						return "vendor";
					}
				},
			},
		},
		chunkSizeWarningLimit: 1000,
		sourcemap: false,
		cssCodeSplit: true,
	},
}));
