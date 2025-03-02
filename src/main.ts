import {
    App, Plugin, PluginSettingTab, Setting, Workspace, WorkspaceLeaf, WorkspaceRoot, WorkspaceFloating,
    EditableFileView, View, TFile,
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

const ORIGINAL_PANE_TYPE_KEY = "openTabSettingsPluginOriginalPaneType" as const;

export default class OpenTabSettingsPlugin extends Plugin {
    settings: OpenTabSettingsPluginSettings = DEFAULT_SETTINGS;
    private monkeyPatches: (() => void)[] = []

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new OpenTabSettingsPluginSettingTab(this.app, this));
        const plugin = this;

        // Patch getLeaf to always open in new tab
        this.monkeyPatches.push(
            monkeyAround.around(Workspace.prototype, {
                getLeaf(oldMethod: any) {
                    return function(this: Workspace, newLeaf, ...args) {
                        // newLeaf false or undefined means open in current tab. Here we replace those with 'tab' to
                        // always open in new tab.
                        let leaf: WorkspaceLeaf;
                        if (plugin.settings.openInNewTab && !newLeaf) {
                            leaf = oldMethod.call(this, 'tab', ...args);
                            // Force focusing the new tab even if focusNewTab is false.
                            if (!(plugin.app.vault as any).getConfig('focusNewTab')) {
                                // Might be safer to do this after the layout-change event?
                                plugin.app.workspace.setActiveLeaf(leaf, {focus: true});
                            }
                        } else {
                            // use default behavior
                            leaf = oldMethod.call(this, newLeaf, ...args);
                        }
                        // We set this so we can avoid deduplicating if the pane was opened via explicit new tab
                        (leaf as any)[ORIGINAL_PANE_TYPE_KEY] = newLeaf;
                        return leaf;
                    }
                }
            })
        );

        // Patch openFile to deduplicate tabs
        this.monkeyPatches.push(
            monkeyAround.around(WorkspaceLeaf.prototype, {
                openFile(oldMethod: any) {
                    return async function(this: WorkspaceLeaf, file, openState, ...args) {
                        // if the leaf was opened via an explicit new tab or open in right etc. don't deduplicate.
                        const openedExplicitly = (
                            this.view.getViewType() == "empty" && !!(this as any)[ORIGINAL_PANE_TYPE_KEY]
                        )
                        if (plugin.settings.deduplicateTabs && !openedExplicitly) {
                            // Check if there are any duplicate tabs
                            const matches = await plugin.findMatchingLeaves(file);
                            if (!matches.includes(this) && matches.length > 0) {
                                const activeLeaf = plugin.app.workspace.getActiveViewOfType(View)?.leaf;

                                const result = await oldMethod.call(matches[0], file, {
                                    ...openState,
                                    active: activeLeaf == this,
                                }, ...args);
                                // If openInNewTab is also enabled, then it will be called first and make a new tab.
                                // Here we just close the tab after switching to the existing tab.
                                // TODO: Is there a cleaner way to do this?
                                if (this.view.getViewType() == "empty") {
                                    await this.detach();
                                }
                                return result;
                            }
                        }

                        // use default behavior
                        return oldMethod.call(this, file, openState, ...args)
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

    private async findMatchingLeaves(file: TFile) {
        const matches: WorkspaceLeaf[] = []; 
        this.app.workspace.iterateAllLeaves(leaf => {
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
        return matches;
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
            .setDesc('Open files in a new tab by default.')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.openInNewTab)
                    .onChange(async (value) => {
                        this.plugin.settings.openInNewTab = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(this.containerEl)
            .setName('Deduplicate tabs')
            .setDesc('If a tab is already open, focus it instead of re-opening it.')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.deduplicateTabs)
                    .onChange(async (value) => {
                        this.plugin.settings.deduplicateTabs = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}
