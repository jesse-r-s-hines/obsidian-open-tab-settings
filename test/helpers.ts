import type { default as OpenTabSettingsPlugin } from "src/main.js"

declare module "wdio-obsidian-service" {
    interface InstalledPlugins {
        openTabSettings: OpenTabSettingsPlugin,
    }
}
