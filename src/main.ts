import {
    App, Plugin, PluginSettingTab, Setting, Workspace, WorkspaceLeaf, WorkspaceRoot, WorkspaceFloating,
    View, TFile, PaneType, WorkspaceTabs, WorkspaceItem, Platform,
} from 'obsidian';
import { PaneTypePatch, TabGroup } from './types';
import * as monkeyAround from 'monkey-around';

const NEW_TAB_PLACEMENTS = {
    "after-active": "After active tab",
    "after-pinned": "After pinned tabs",
    "end": "At end",
};


export interface OpenTabSettingsPluginSettings {
    openInNewTab: boolean,
    deduplicateTabs: boolean,
    newTabPlacement: keyof typeof NEW_TAB_PLACEMENTS,
    openNewTabsInOtherTabGroup: boolean,
}

const DEFAULT_SETTINGS: OpenTabSettingsPluginSettings = {
    openInNewTab: true,
    deduplicateTabs: true,
    newTabPlacement: "after-active",
    openNewTabsInOtherTabGroup: false,
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
                        // the new tab was requested via a normal, unmodified click
                        const isDefaultNewTab = plugin.settings.openInNewTab && !newLeaf;
                        // resolve newLeaf to enum
                        if (newLeaf == true) {
                            newLeaf = 'tab';
                        } else if (plugin.settings.openInNewTab) {
                            newLeaf = newLeaf || 'tab';
                        } else {
                            newLeaf = newLeaf || 'same';
                        }

                        let leaf: WorkspaceLeaf;
                        if (newLeaf == 'tab') {
                            leaf = plugin.getNewLeaf();
                        } else {
                            leaf = oldMethod.call(this, (newLeaf == 'same' ? false : newLeaf), ...args);
                        }

                        // if focusNewTab is set, set to active like default Obsidian behavior. We also always focus
                        // new tabs created by normal click regardless of focusNewTab
                        if (plugin.app.vault.getConfig('focusNewTab') || isDefaultNewTab) {
                            plugin.app.workspace.setActiveLeaf(leaf);
                        }

                        // We set this so we can avoid deduplicating if the pane was opened via explicit new tab
                        leaf.openTabSettingsLastOpenType = newLeaf;

                        return leaf;
                    }
                },
            })
        );

        // Patch openFile to deduplicate tabs
        this.register(
            monkeyAround.around(WorkspaceLeaf.prototype, {
                openFile(oldMethod: any) {
                    return async function(this: WorkspaceLeaf, file, openState, ...args) {
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
                                    active: !!openState?.active || activeLeaf == this,
                                }, ...args);
                                // If a file is opened in new tab, either from middle click or if openInNewTab is
                                // enabled, then getLeaf('tab') will be called first and make a new empty tab. Here we
                                // just close the empty tab after switching to the existing tab, as long as doing so
                                // won't close the whole tab group
                                if (isEmpty && this.parent.children.length > 1) {
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
        const dataFile = await this.loadData() ?? {};
        this.settings = Object.assign({}, DEFAULT_SETTINGS, dataFile);

        if (Object.keys(dataFile).length == 0) {
            // when using this plugin, focusNewTab should default to false. Set it if this is the first time we've
            // loaded the plugin.
            this.app.vault.setConfig('focusNewTab', false);
            await this.saveSettings();
        }
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

    /**
     * Gets all tab groups, sorted by active time.
     */
    private getAllTabGroups(root: WorkspaceItem): WorkspaceTabs[] {
        const tabGroups: Set<TabGroup> = new Set(); // sets are ordered
        this.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.getRoot() == root) {
                tabGroups.add(leaf.parent);
            }
        });
        const getActiveTime = (g: TabGroup) => Math.max(...g.children.map(l => l.activeTime ?? 0));
        return [...tabGroups].sort((a, b) => getActiveTime(a) - getActiveTime(b));
    }

    /**
     * Custom variant of the internal workspace.createLeafInTabGroup function that follows our new tab placement logic.
     */
    private getNewLeaf() {
        const activeLeaf = this.app.workspace.getMostRecentLeaf();
        if (!activeLeaf) throw new Error("No tab group found.");
        const activeTabGroup = activeLeaf.parent;
        const activeIndex = activeTabGroup.children.indexOf(activeLeaf);

        // This is default Obsidian behavior, if active leaf is empty new tab replaces it instead of making a new one.
        if (activeLeaf.view.getViewType() == "empty") {
            return activeLeaf;
        }

        let dest: TabGroup|undefined;
        let index = 0;
        if (this.settings.openNewTabsInOtherTabGroup && !Platform.isPhone) {
            // check if there is a split in the same window
            const otherTabGroup = this.getAllTabGroups(activeLeaf.getRoot()).filter(g => g !== activeTabGroup).at(-1);
            if (otherTabGroup) {
                dest = otherTabGroup;
                index = otherTabGroup.children.length;
            }
        }
        if (!dest && this.settings.newTabPlacement == "after-pinned") {
            if (activeLeaf.pinned) {
                dest = activeTabGroup;
                const nextUnpinned = dest.children.findIndex((l, i) => !l.pinned && i > activeIndex);
                index = nextUnpinned < 0 ? dest.children.length : nextUnpinned;
            }
        }
        if (!dest && this.settings.newTabPlacement == "end") {
            dest = activeTabGroup;
            index = activeTabGroup.children.length;
        }
        if (!dest) {
            dest = activeTabGroup;
            index = activeIndex + 1;
        }

        let newLeaf: WorkspaceLeaf;
        // we re-use empty tabs more aggressively than default Obsidian. If the tab at the new location is empty, re-use
        // it instead of creating a new one.
        const leafToDisplace = dest.children[Math.min(index, dest.children.length - 1)];
        if (leafToDisplace.view.getViewType() == "empty") {
            newLeaf = leafToDisplace;
        } else {
            newLeaf = new (WorkspaceLeaf as any)(this.app);
            dest.insertChild(index, newLeaf);
        }

        return newLeaf;
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
            .setName('Prevent duplicate tabs')
            .setDesc('If a tab is already open, switch to it instead of re-opening it.')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.deduplicateTabs)
                    .onChange(async (value) => {
                        this.plugin.settings.deduplicateTabs = value;
                        await this.plugin.saveSettings();
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
                        await this.plugin.saveSettings();
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
                        this.plugin.settings.newTabPlacement = value as keyof typeof NEW_TAB_PLACEMENTS;
                        await this.plugin.saveSettings();
                    })
            )

        new Setting(this.containerEl)
            .setName('Prefer opening new tabs in other tab group')
            .setDesc('When the workspace is split, open links in the opposite panel.')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.openNewTabsInOtherTabGroup)
                    .onChange(async (value) => {
                        this.plugin.settings.openNewTabsInOtherTabGroup = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}
