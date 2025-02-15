import { MyPluginSettings } from "src/main.js"

export async function setSettings(settings: Partial<MyPluginSettings>) {
    await browser.execute((settings) => {
        const plugin = (optl.app as any).plugins.plugins['sample-plugin']
        Object.assign(plugin.settings, settings);
        plugin.saveSettings();
    }, settings)
}
