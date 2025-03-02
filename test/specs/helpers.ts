import { OpenTabSettingsPluginSettings } from "src/main.js"

export async function setSettings(settings: Partial<OpenTabSettingsPluginSettings>) {
    await browser.executeObsidian(({app}, settings) => {
        const plugin = (app as any).plugins.plugins['open-tab-settings']
        Object.assign(plugin.settings, settings);
        plugin.saveSettings();
    }, settings)
}
