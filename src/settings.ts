import { App, PluginSettingTab, Setting } from 'obsidian';
import OpenTabSettingsPlugin from "./main"

export const NEW_TAB_PLACEMENTS = {
    "after-active": "After active tab",
    "after-pinned": "After pinned tabs",
    "beginning": "At beginning",
    "end": "At end",
};

export const NEW_TAB_TAB_GROUP_PLACEMENTS = {
    "same": "In same tab group",
    "opposite": "In opposite tab group",
    "first": "In first tab group",
    "last": "In last tab group",
};

export const MOD_CLICK_BEHAVIOR = {
    "tab": "In new tab",
    "same": "In same tab",
    "allow-duplicate": "In duplicate tab",
    "opposite": "In opposite tab group",
}

export interface OpenTabSettingsPluginSettings {
    openInNewTab: boolean,
    deduplicateTabs: boolean,
    deduplicateAcrossTabGroups: boolean,
    newTabPlacement: keyof typeof NEW_TAB_PLACEMENTS,
    newTabTabGroupPlacement: "same"|"opposite"|"first"|"last",
    modClickBehavior: keyof typeof MOD_CLICK_BEHAVIOR,
}

export const DEFAULT_SETTINGS: OpenTabSettingsPluginSettings = {
    openInNewTab: true,
    deduplicateTabs: true,
    deduplicateAcrossTabGroups: true,
    newTabPlacement: "after-active",
    newTabTabGroupPlacement: "same",
    modClickBehavior: "tab",
}

export class OpenTabSettingsPluginSettingTab extends PluginSettingTab {
    plugin: OpenTabSettingsPlugin;

    constructor(app: App, plugin: OpenTabSettingsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        this.containerEl.empty();
        new Setting(this.containerEl)
            .setName('Always open in new tab')
            .setDesc('Open files in a new tab by default.')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.openInNewTab)
                    .onChange(async (value) => {
                        const modClickBehavior = this.plugin.settings.modClickBehavior;
                        await this.plugin.updateSettings({
                            openInNewTab: value,
                            modClickBehavior: (!value && modClickBehavior == "same") ? "tab" : modClickBehavior,
                        });
                        this.display();
                    })
            );

        new Setting(this.containerEl)
            .setName('Prevent duplicate tabs')
            .setDesc('If a tab is already open, switch to it instead of re-opening it.')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.deduplicateTabs)
                    .onChange(async (value) => {
                        const modClickBehavior = this.plugin.settings.modClickBehavior;
                        await this.plugin.updateSettings({
                            deduplicateTabs: value,
                            modClickBehavior: (!value && modClickBehavior == "allow-duplicate") ? "tab" : modClickBehavior,
                        });
                        this.display();
                    })
            );

        new Setting(this.containerEl)
            .setName('Deduplicate across tab groups')
            .setDesc('Whether to switch to already open file even if its in a split pane or popout window')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.deduplicateAcrossTabGroups)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({deduplicateAcrossTabGroups: value});
                    })
            )
            .setDisabled(!this.plugin.settings.deduplicateTabs)
            .settingEl
            .setCssStyles({opacity: this.plugin.settings.deduplicateTabs ? "" : "50%"});

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
            .setDesc('Place new tabs...')
            .addDropdown(dropdown => 
                dropdown
                    .addOptions(NEW_TAB_PLACEMENTS)
                    .setValue(this.plugin.settings.newTabPlacement)
                    .onChange(async value => {
                        await this.plugin.updateSettings({
                            newTabPlacement: value as keyof typeof NEW_TAB_PLACEMENTS,
                        });
                    })
            )

        new Setting(this.containerEl)
            .setName('New tab tab group placement')
            .setDesc('When the workspace is split, prefer to open new tabs...')
            .addDropdown(toggle =>
                toggle
                    .addOptions(NEW_TAB_TAB_GROUP_PLACEMENTS)
                    .setValue(this.plugin.settings.newTabTabGroupPlacement)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({
                            newTabTabGroupPlacement: value as keyof typeof NEW_TAB_TAB_GROUP_PLACEMENTS,
                        });
                    })
            );

        new Setting(this.containerEl)
            .setName('Mod click behavior')
            .setDesc('On Ctrl/Cmd/middle click open links...')
            .addDropdown(dropdown => {
                dropdown.addOption("tab", MOD_CLICK_BEHAVIOR['tab']);
                if (this.plugin.settings.openInNewTab) {
                    dropdown.addOption("same", MOD_CLICK_BEHAVIOR['same'])
                }
                if (this.plugin.settings.deduplicateTabs) {
                    dropdown.addOption("allow-duplicate", MOD_CLICK_BEHAVIOR['allow-duplicate'])
                }
                dropdown.addOption("opposite", MOD_CLICK_BEHAVIOR['opposite'])
                dropdown
                    .setValue(this.plugin.settings.modClickBehavior)
                    .onChange(async value => {
                        console.log("modClickBehavior onChange")
                        await this.plugin.updateSettings({
                            modClickBehavior: value as keyof typeof MOD_CLICK_BEHAVIOR,
                        });
                    })
            })
    }
}
