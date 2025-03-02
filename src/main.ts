import {
    App, Plugin, PluginSettingTab, Setting, Workspace, WorkspaceLeaf, WorkspaceRoot, WorkspaceFloating,
    EditableFileView,
} from 'obsidian';
import * as monkeyAround from 'monkey-around';

// Remember to rename these classes and interfaces!

export interface OpenTabSettingsPluginSettings {
    openInNewTab: boolean,
    deduplicateTabs: boolean,
}

const DEFAULT_SETTINGS: OpenTabSettingsPluginSettings = {
    openInNewTab: true,
    deduplicateTabs: true,
}

export default class OpenTabSettingsPlugin extends Plugin {
    settings: OpenTabSettingsPluginSettings = DEFAULT_SETTINGS;
    private monkeyPatches: (() => void)[] = []

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new OpenTabSettingsPluginSettingTab(this.app, this));

        // Patch getLeaf to always open in new tab
        const plugin = this
        this.monkeyPatches.push(
            monkeyAround.around(Workspace.prototype, {
                getLeaf(oldMethod: any) {
                    return function(this: Workspace, newLeaf, ...args) {
                        // newLeaf false or undefined means open in current tab. Here we replace those with 'tab' to
                        // always open in new tab.
                        if (plugin.settings.openInNewTab && !newLeaf) {
                            const leaf = oldMethod.call(this, 'tab', ...args);
                            // Force focusing the new tab even if focusNewTab is false.
                            if (!(plugin.app.vault as any).getConfig('focusNewTab')) {
                                // Might be safer to do this after the layout-change event?
                                plugin.app.workspace.setActiveLeaf(leaf, {focus: true});
                            }
                            return leaf
                        }

                        // use default behavior
                        return oldMethod.call(this, newLeaf, ...args);
                    }
                }
            })
        );

        this.monkeyPatches.push(
            monkeyAround.around(WorkspaceLeaf.prototype, {
                openFile(oldMethod: any) {
                    return async function(this: WorkspaceLeaf, file, ...args) {
                        if (plugin.settings.deduplicateTabs) {
                            // Check if there are any duplicate tabs
                            const matches: WorkspaceLeaf[] = [];
                            plugin.app.workspace.iterateAllLeaves(leaf => {
                                const root = leaf.getRoot();
                                // Only check files in the main area or floating windows, not sidebars
                                const isMainLeaf = (root instanceof WorkspaceRoot || root instanceof WorkspaceFloating);
                                // Check that the file path matches and its a normal file leaf. "FileView" type includes
                                // views like outgoing-links which we don't want to switch to. EditableFileView includes
                                // Markdown, PDF, and images but not views like outgoing-links.
                                const fileMatch = (
                                    leaf.view instanceof EditableFileView &&
                                    leaf.view.file?.path == file.path
                                );
                                if (isMainLeaf && fileMatch) {
                                    matches.push(leaf);
                                }
                            });

                            if (matches.length > 0) {
                                // switch to first matching leaf
                                await plugin.app.workspace.setActiveLeaf(matches[0], {focus: true})
                                // If openInNewTab is also enabled, then it will be called first and make a new tab.
                                // Here we just close the tab before we jump to the existing one.
                                // TODO: Is there a cleaner way to do this?
                                if (this.view.getViewType() == "empty") {
                                    this.detach();
                                }
                                return oldMethod.call(matches[0], file, ...args);
                            }
                        }

                        // use default behavior
                        return oldMethod.call(this, file, ...args)
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

class OpenTabSettingsPluginSettingTab extends PluginSettingTab {
    plugin: OpenTabSettingsPlugin;

    constructor(app: App, plugin: OpenTabSettingsPlugin) {
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
