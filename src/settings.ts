import { App, PluginSettingTab, Setting } from 'obsidian';
import OpenTabSettingsPlugin from "./main"

export const NEW_TAB_PLACEMENTS = {
    "after-active": "After active tab",
    "after-pinned": "After pinned tabs",
    "end": "At end",
};

export interface OpenTabSettingsPluginSettings {
    openInNewTab: boolean,
    deduplicateTabs: boolean,
    openInSameTabOnModClick: boolean,
    newTabPlacement: keyof typeof NEW_TAB_PLACEMENTS,
    openNewTabsInOtherTabGroup: boolean,
}

export const DEFAULT_SETTINGS: OpenTabSettingsPluginSettings = {
    openInNewTab: true,
    deduplicateTabs: true,
    openInSameTabOnModClick: false,
    newTabPlacement: "after-active",
    openNewTabsInOtherTabGroup: false,
}

export class OpenTabSettingsPluginSettingTab extends PluginSettingTab {
    plugin: OpenTabSettingsPlugin;

    constructor(app: App, plugin: OpenTabSettingsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        this.containerEl.empty();

        const update = () => {
            openInSameTabOnModClickSetting.settingEl.setCssStyles({
                opacity: this.plugin.settings.openInNewTab ? "" : "50%",
            });
            openInSameTabOnModClickSetting.setDisabled(!this.plugin.settings.openInNewTab);
        }

        new Setting(this.containerEl)
            .setName('Always open in new tab')
            .setDesc('Open files in a new tab by default.')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.openInNewTab)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({openInNewTab: value});
                        update();
                    })
            );

        new Setting(this.containerEl)
            .setName('Prevent duplicate tabs')
            .setDesc('If a tab is already open, switch to it instead of re-opening it.')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.deduplicateTabs)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({deduplicateTabs: value});
                    })
            );

        const openInSameTabOnModClickSetting = new Setting(this.containerEl)
            .setName('Open in same tab on ctrl/middle click')
            .setDesc(
                'When "Always open in new tab" is enabled, open in same tab when using Ctrl click or middle click.'
            )
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.openInSameTabOnModClick)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({openInSameTabOnModClick: value});
                    })
            );

        new Setting(this.containerEl)
            .setName('Focus explicit new tabs')
            .setDesc(
                'Immediately switch to new tabs opened via middle or ctrl click instead of opening them in the ' +
                'background. New tabs created by regular click will always focus regardless.'
            )
            // this is just an alias for Obsidian Settings > Editor > Always focus new tabs
            .addToggle(toggle =>
                toggle
                    .setValue(this.app.vault.getConfig("focusNewTab") as boolean)
                    .onChange(async (value) => {
                        this.app.vault.setConfig("focusNewTab", value)
                    })
            );

        new Setting(this.containerEl)
            .setName('New tab placement')
            .setDesc('Where to place new tabs.')
            .addDropdown(dropdown => 
                dropdown
                    .addOptions(NEW_TAB_PLACEMENTS)
                    .setValue(this.plugin.settings.newTabPlacement)
                    .onChange(async value => {
                        await this.plugin.updateSettings({newTabPlacement: value as keyof typeof NEW_TAB_PLACEMENTS});
                    })
            )

        new Setting(this.containerEl)
            .setName('Prefer opening new tabs in other tab group')
            .setDesc('When the workspace is split, open links in the opposite panel.')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.openNewTabsInOtherTabGroup)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({openNewTabsInOtherTabGroup: value});
                    })
            );

        update();
    }
}
