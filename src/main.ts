import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, Workspace } from 'obsidian';
import * as monkeyAround from 'monkey-around';

// Remember to rename these classes and interfaces!

export interface MyPluginSettings {
    openInNewTab: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    openInNewTab: true,
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings = DEFAULT_SETTINGS;
    private monkeyPatches: (() => void)[] = []

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new SampleSettingTab(this.app, this));

        // Patch getLeaf to always open in new tab
        this.monkeyPatches.push(
            monkeyAround.around(this.app.workspace.constructor.prototype, {
                getLeaf(oldMethod) {
                    return function(this: Workspace, newLeaf?: string|boolean, ...args: any[]) {
                        // newLeaf false or undefined means open in current tab. Here we replace those with 'tab' to
                        // always open in new tab.
                        newLeaf = newLeaf || 'tab';
                        return oldMethod.call(this, newLeaf, ...args)
                    }
                }
            })
        );
    }

    onunload() {
        for (const uninstaller of this.monkeyPatches) {
            uninstaller();
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        this.containerEl.empty();

        new Setting(this.containerEl)
            .setName('Always open in new tab')
            .setDesc('Always open files in a new tab.')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.openInNewTab)
                    .onChange(async (value) => {
                        this.plugin.settings.openInNewTab = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}
