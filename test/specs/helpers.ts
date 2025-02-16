import { MyPluginSettings } from "src/main.js"

export async function setSettings(settings: Partial<MyPluginSettings>) {
    await browser.executeObsidian(({app}, settings) => {
        const plugin = (app as any).plugins.plugins['sample-plugin']
        Object.assign(plugin.settings, settings);
        plugin.saveSettings();
    }, settings)
}
