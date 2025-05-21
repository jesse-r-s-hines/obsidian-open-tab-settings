import {
    App, Plugin, PluginSettingTab, Setting, Workspace, WorkspaceLeaf, WorkspaceRoot, WorkspaceFloating,
    View, TFile, PaneType,
} from 'obsidian';
import * as monkeyAround from 'monkey-around';

export interface OpenTabSettingsPluginSettings {
    openInNewTab: boolean,
    deduplicateTabs: boolean,
}

const DEFAULT_SETTINGS: OpenTabSettingsPluginSettings = {
    openInNewTab: true,
    deduplicateTabs: true,
}

/** We use this key to check if can safely close a recently created empty leaf during file deduplication. */
type PaneTypePatch = PaneType|"same";
type LeafPatch = WorkspaceLeaf & {
    openTabSettingsLastOpenType?: PaneTypePatch,
}


export default class OpenTabSettingsPlugin extends Plugin {
    settings: OpenTabSettingsPluginSettings = DEFAULT_SETTINGS;

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new OpenTabSettingsPluginSettingTab(this.app, this));
        const plugin = this;

        // Patch getLeaf to always open in new tab
        this.register(
            monkeyAround.around(Workspace.prototype, {
                getLeaf(oldMethod: any) {
                    return function(this: Workspace, newLeaf?: PaneTypePatch|boolean, ...args) {
                        // newLeaf false or undefined means open in current tab. Here we replace those with 'tab' to
                        // always open in new tab.
                        let leaf: WorkspaceLeaf;
                        if (plugin.settings.openInNewTab && !newLeaf) {
                            newLeaf = "tab"
                            leaf = oldMethod.call(this, newLeaf, ...args);
                            // Force focusing the new tab even if focusNewTab is false.
                            if (!plugin.app.vault.getConfig('focusNewTab')) {
                                // Might be safer to do this after the layout-change event?
                                plugin.app.workspace.setActiveLeaf(leaf, {focus: true});
                            }
                        } else {
                            // use default behavior
                            leaf = oldMethod.call(this, (newLeaf == 'same' ? false : newLeaf), ...args);
                        }
                        if (typeof newLeaf == 'boolean' || newLeaf == undefined) {
                            newLeaf = newLeaf ? 'tab' : 'same';
                        }
                        // We set this so we can avoid deduplicating if the pane was opened via explicit new tab
                        (leaf as LeafPatch).openTabSettingsLastOpenType = newLeaf;
                        return leaf;
                    }
                },
            })
        );

        // Patch openFile to deduplicate tabs
        this.register(
            monkeyAround.around(WorkspaceLeaf.prototype, {
                openFile(oldMethod: any) {
                    return async function(this: LeafPatch, file, openState, ...args) {
                        const isEmpty = this.view.getViewType() == "empty";
                        // if the leaf is new (empty) and was opened via an explicit open in new window or split, don't
                        // deduplicate. Note that opening in new window doesn't call getLeaf (it calls openPopoutLeaf
                        // directly) so we assume undefined lastOpenType is a new window. getLeaf("same") will update
                        // lastOpenType, so we shouldn't need to worry about if lastOpenType is undefined because the
                        // leaf was created before the plugin was loaded or such.
                        const isSpecialOpen = isEmpty && (
                            !this.openTabSettingsLastOpenType ||
                            !['same', 'tab'].includes(this.openTabSettingsLastOpenType)
                        );
                        if (plugin.settings.deduplicateTabs && !isSpecialOpen) {
                            // Check if there are any duplicate tabs
                            const matches = await plugin.findMatchingLeaves(file);
                            if (!matches.includes(this) && matches.length > 0) {
                                const activeLeaf = plugin.app.workspace.getActiveViewOfType(View)?.leaf;

                                const result = await oldMethod.call(matches[0], file, {
                                    ...openState,
                                    active: activeLeaf == this,
                                }, ...args);
                                // If a file is opened in new tab, either from middle click or if openInNewTab is
                                // enabled, then getLeaf('tab') will be called first and make a new empty tab. Here we
                                // just close the tab after switching to the existing tab.
                                // TODO: Is there a cleaner way to do this?
                                if (isEmpty) {
                                    this.detach();
                                }
                                return result;
                            }
                        }

                        // use default behavior
                        return oldMethod.call(this, file, openState, ...args)
                    }
                },
            })
        );

        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file, source, leaf) => {
                if (file instanceof TFile) {
                    menu.addItem((item) => {
                        item.setSection("open");
                        item.setIcon("file-minus")
                        item.setTitle("Open in same tab");
                        item.onClick(async () => {
                            await this.app.workspace.getLeaf('same' as PaneType).openFile(file);
                        });
                    });
                }
            })
        );
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

            // Only match files in the main area or floating windows, not sidebars
            const isMainLeaf = (root instanceof WorkspaceRoot || root instanceof WorkspaceFloating);
            // file is the same
            const isFileMatch = leaf.getViewState()?.state?.file == file.path;
            // we only want to switch to another leaf if its a basic file, not if its outgoing-links etc.
            const viewType = leaf.view.getViewType();
            const isTypeMatch = (
                this.app.viewRegistry.getTypeByExtension(file.extension) == viewType ||
                (file.extension == "md" && viewType == "excalidraw") // special case for excalidraw
            );

            if (isMainLeaf && isFileMatch && isTypeMatch) {
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

        new Setting(this.containerEl)
            .setDesc('See also: "Always focus in new tab" in Obsidian Editor options')
    }
}
