import type { default as OpenTabSettingsPlugin } from "src/main.js"

export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

declare module "wdio-obsidian-service" {
    interface InstalledPlugins {
        openTabSettings: OpenTabSettingsPlugin,
    }
}
