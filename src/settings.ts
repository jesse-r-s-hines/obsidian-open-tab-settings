import { App, Notice, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import OpenTabSettingsPlugin from "./main"
import { t } from 'i18next';

export const NEW_TAB_PLACEMENTS = {
    "afterActive": 'settings.newTabPlacement.options.afterActive',
    "beforeActive": 'settings.newTabPlacement.options.beforeActive',
    "afterPinned": 'settings.newTabPlacement.options.afterPinned',
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
    "allowDuplicate": 'settings.modClickBehavior.options.allowDuplicate',
    "opposite": 'settings.modClickBehavior.options.opposite',
    "noPreview": 'settings.modClickBehavior.options.noPreview',
    "placeAfterActive": 'settings.modClickBehavior.options.placeAfterActive',
    "placeBeforeActive": 'settings.modClickBehavior.options.placeBeforeActive',
    "placeAtBeginning": 'settings.modClickBehavior.options.placeAtBeginning',
    "placeAtEnd": 'settings.modClickBehavior.options.placeAtEnd',
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
    newTabPlacement: "afterActive",
    newTabTabGroupPlacement: "same",
    modClickBehavior: "tab",
}

function translateOptions(options: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(options).map(([value, label]) => [value, t(label)]));
}

export const DISABLED_KEY = "open-tab-settings:disabled-on-device";

export class OpenTabSettingsPluginSettingTab extends PluginSettingTab {
    plugin: OpenTabSettingsPlugin;

    constructor(app: App, plugin: OpenTabSettingsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.containerEl.addClass('open-tab-settings-settings-tab');
    }

    getControlValue(key: string): unknown {
        return this.plugin.settings[key as keyof OpenTabSettingsPluginSettings];
    }

    async setControlValue(key: string, value: unknown): Promise<void> {
        await this.plugin.updateSettings({[key]: value});
        this.update();
    }

    getSettingDefinitions(): SettingDefinitionItem<keyof OpenTabSettingsPluginSettings>[] {
        const settings = this.plugin.settings;
        const modClickOptions: (keyof typeof MOD_CLICK_BEHAVIOR)[] = [];
        modClickOptions.push('tab');
        if (settings.openInNewTab) modClickOptions.push('same');
        if (settings.deduplicateTabs) modClickOptions.push('allowDuplicate');
        modClickOptions.push('opposite');
        if (settings.previewTabs) modClickOptions.push('noPreview');
        if (settings.newTabPlacement != "afterActive") modClickOptions.push('placeAfterActive');
        if (settings.newTabPlacement != "beforeActive") modClickOptions.push('placeBeforeActive');
        if (settings.newTabPlacement != "beginning") modClickOptions.push('placeAtBeginning');
        if (settings.newTabPlacement != "end") modClickOptions.push('placeAtEnd');

        return [
            {
                name: t('settings.openInNewTab.name'),
                desc: t('settings.openInNewTab.description'),
                control: {
                    type: 'toggle',
                    key: 'openInNewTab',
                },
            }, {
                name: t('settings.previewTabs.name'),
                desc: t('settings.previewTabs.description'),
                control: {
                    type: 'toggle',
                    key: 'previewTabs',
                    disabled: () => !settings.openInNewTab,
                },
            }, {
                name: t('settings.deduplicateTabs.name'),
                desc: t('settings.deduplicateTabs.description'),
                control: {
                    type: 'toggle',
                    key: 'deduplicateTabs',
                },
            }, {
                name: t('settings.deduplicateAcrossTabGroups.name'),
                desc: t('settings.deduplicateAcrossTabGroups.description'),
                control: {
                    type: 'toggle',
                    key: 'deduplicateAcrossTabGroups',
                    disabled: () => !settings.deduplicateTabs,
                },
            }, {
                name: t('settings.focusNewTabs.name'),
                desc: t('settings.focusNewTabs.description'),
                // this is just an alias for Obsidian Settings > Editor > Always focus new tabs
                render: setting => {
                    setting.addToggle(toggle =>
                        toggle
                            .setValue(this.app.vault.getConfig("focusNewTab") ? true : false)
                            .onChange((value) => {
                                this.app.vault.setConfig("focusNewTab", value)
                            })
                    )
                }
            }, {
                name: t('settings.newTabPlacement.name'),
                desc: t('settings.newTabPlacement.description'),
                control: {
                    type: 'dropdown',
                    key: 'newTabPlacement',
                    options: translateOptions(NEW_TAB_PLACEMENTS),
                },
            }, {
                name: t('settings.newTabTabGroupPlacement.name'),
                desc: t('settings.newTabTabGroupPlacement.description'),
                control: {
                    type: 'dropdown',
                    key: 'newTabTabGroupPlacement',
                    options: translateOptions(NEW_TAB_TAB_GROUP_PLACEMENTS),
                },
            }, {
                name: t('settings.modClickBehavior.name'),
                desc: t('settings.modClickBehavior.description'),
                control: {
                    type: 'dropdown',
                    key: 'modClickBehavior',
                    options: translateOptions(Object.fromEntries(modClickOptions.map(k => [k, MOD_CLICK_BEHAVIOR[k]]))),
                },
            }, {
                name: t('settings.disableOnDevice.name'),
                desc: t('settings.disableOnDevice.description'),
                render: setting => {
                    setting.addToggle(toggle =>
                        toggle
                            .setValue(this.app.loadLocalStorage(DISABLED_KEY) ? true : false)
                            .onChange((value) => {
                                this.app.saveLocalStorage(DISABLED_KEY, value ? true : null);
                                new Notice(t('settings.disableOnDevice.notice'), 5000);
                            })
                    )
                }
            }
        ];
    };
}
