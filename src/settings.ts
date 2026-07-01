import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import OpenTabSettingsPlugin from "./main"
import { t } from 'i18next';

export const NEW_TAB_PLACEMENTS = {
    "after-active": 'settings.newTabPlacement.options.after-active',
    "after-pinned": 'settings.newTabPlacement.options.after-pinned',
    "beginning": 'settings.newTabPlacement.options.beginning',
    "end": 'settings.newTabPlacement.options.end',
};

export const NEW_TAB_TAB_GROUP_PLACEMENTS = {
    "same": 'settings.newTabTabGroupPlacement.options.same',
    "opposite": 'settings.newTabTabGroupPlacement.options.opposite',
    "first": 'settings.newTabTabGroupPlacement.options.first',
    "last": 'settings.newTabTabGroupPlacement.options.last',
};

export const MOD_CLICK_BEHAVIOR = {
    "tab": 'settings.modClickBehavior.options.tab',
    "same": 'settings.modClickBehavior.options.same',
    "allow_duplicate": 'settings.modClickBehavior.options.allow_duplicate',
    "opposite": 'settings.modClickBehavior.options.opposite',
    "no_preview": 'settings.modClickBehavior.options.no_preview',
}

export interface OpenTabSettingsPluginSettings {
    openInNewTab: boolean,
    previewTabs: boolean,
    deduplicateTabs: boolean,
    deduplicateAcrossTabGroups: boolean,
    newTabPlacement: keyof typeof NEW_TAB_PLACEMENTS,
    newTabTabGroupPlacement: "same"|"opposite"|"first"|"last",
    modClickBehavior: keyof typeof MOD_CLICK_BEHAVIOR,
}

export const DEFAULT_SETTINGS: OpenTabSettingsPluginSettings = {
    openInNewTab: true,
    previewTabs: false,
    deduplicateTabs: true,
    deduplicateAcrossTabGroups: true,
    newTabPlacement: "after-active",
    newTabTabGroupPlacement: "same",
    modClickBehavior: "tab",
}

function translateOptions(options: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(options).map(([value, label]) => [value, t(label)]));
}

const DISABLED_KEY = "open-tab-settings:disabled-on-device";

export function isDisabledOnDevice(): boolean {
    return window.localStorage.getItem(DISABLED_KEY) === "true";
}

export function setDisabledOnDevice(value: boolean): void {
    if (value) {
        window.localStorage.setItem(DISABLED_KEY, "true");
    } else {
        window.localStorage.removeItem(DISABLED_KEY);
    }
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
            .setName(t('settings.openInNewTab.name'))
            .setDesc(t('settings.openInNewTab.description'))
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.openInNewTab)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({openInNewTab: value});
                        this.display();
                    })
            );

        new Setting(this.containerEl)
            .setName(t('settings.previewTabs.name'))
            .setDesc(t('settings.previewTabs.description'))
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.previewTabs)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({previewTabs: value});
                        this.display();
                    })
            )
            .setDisabled(!this.plugin.settings.openInNewTab)
            .settingEl
            .setCssStyles({opacity: this.plugin.settings.openInNewTab ? "" : "50%"});

        new Setting(this.containerEl)
            .setName(t('settings.deduplicateTabs.name'))
            .setDesc(t('settings.deduplicateTabs.description'))
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.deduplicateTabs)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({deduplicateTabs: value});
                        this.display();
                    })
            );

        new Setting(this.containerEl)
            .setName(t('settings.deduplicateAcrossTabGroups.name'))
            .setDesc(t('settings.deduplicateAcrossTabGroups.description'))
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.deduplicateAcrossTabGroups)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({deduplicateAcrossTabGroups: value});
                        this.display();
                    })
            )
            .setDisabled(!this.plugin.settings.deduplicateTabs)
            .settingEl
            .setCssStyles({opacity: this.plugin.settings.deduplicateTabs ? "" : "50%"});

        new Setting(this.containerEl)
            .setName(t('settings.focusNewTabs.name'))
            .setDesc(t('settings.focusNewTabs.description'))
            // this is just an alias for Obsidian Settings > Editor > Always focus new tabs
            .addToggle(toggle =>
                toggle
                    .setValue(this.app.vault.getConfig("focusNewTab") as boolean)
                    .onChange(async (value) => {
                        this.app.vault.setConfig("focusNewTab", value)
                        this.display();
                    })
            );

        new Setting(this.containerEl)
            .setName(t('settings.newTabPlacement.name'))
            .setDesc(t('settings.newTabPlacement.description'))
            .addDropdown(dropdown => 
                dropdown
                    .addOptions(translateOptions(NEW_TAB_PLACEMENTS))
                    .setValue(this.plugin.settings.newTabPlacement)
                    .onChange(async value => {
                        await this.plugin.updateSettings({
                            newTabPlacement: value as keyof typeof NEW_TAB_PLACEMENTS,
                        });
                        this.display();
                    })
            )

        new Setting(this.containerEl)
            .setName(t('settings.newTabTabGroupPlacement.name'))
            .setDesc(t('settings.newTabTabGroupPlacement.description'))
            .addDropdown(dropdown =>
                dropdown
                    .addOptions(translateOptions(NEW_TAB_TAB_GROUP_PLACEMENTS))
                    .setValue(this.plugin.settings.newTabTabGroupPlacement)
                    .onChange(async (value) => {
                        await this.plugin.updateSettings({
                            newTabTabGroupPlacement: value as keyof typeof NEW_TAB_TAB_GROUP_PLACEMENTS,
                        });
                        this.display();
                    })
            );

        new Setting(this.containerEl)
            .setName(t('settings.modClickBehavior.name'))
            .setDesc(t('settings.modClickBehavior.description'))
            .addDropdown(dropdown => {
                dropdown.addOption("tab", t(MOD_CLICK_BEHAVIOR['tab']));
                if (this.plugin.settings.openInNewTab) {
                    dropdown.addOption("same", t(MOD_CLICK_BEHAVIOR['same']))
                }
                if (this.plugin.settings.deduplicateTabs) {
                    dropdown.addOption("allow_duplicate", t(MOD_CLICK_BEHAVIOR['allow_duplicate']))
                }
                dropdown.addOption("opposite", t(MOD_CLICK_BEHAVIOR['opposite']))
                if (this.plugin.settings.previewTabs) {
                    dropdown.addOption("no_preview", t(MOD_CLICK_BEHAVIOR['no_preview']))
                }
                dropdown
                    .setValue(this.plugin.settings.modClickBehavior)
                    .onChange(async value => {
                        await this.plugin.updateSettings({
                            modClickBehavior: value as keyof typeof MOD_CLICK_BEHAVIOR,
                        });
                        this.display();
                    });
            })

        new Setting(this.containerEl)
            .setName(t('settings.disableOnDevice.name'))
            .setDesc(t('settings.disableOnDevice.description'))
            .addToggle(toggle =>
                toggle
                    .setValue(isDisabledOnDevice())
                    .onChange((value) => {
                        setDisabledOnDevice(value);
                        new Notice(t('settings.disableOnDevice.notice'), 5000);
                        this.display();
                    })
            );
    }
}
