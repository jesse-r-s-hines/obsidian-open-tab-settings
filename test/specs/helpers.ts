import type { default as OpenTabSettingsPlugin, OpenTabSettingsPluginSettings } from "src/main.js"

export async function setSettings(settings: Partial<OpenTabSettingsPluginSettings>) {
    await browser.executeObsidian(({app}, settings) => {
        const plugin = app.plugins.plugins['open-tab-settings'] as OpenTabSettingsPlugin
        Object.assign(plugin.settings, settings);
        plugin.saveSettings();
    }, settings)
}

export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
