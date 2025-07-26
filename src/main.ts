import {
    Plugin, Workspace, WorkspaceLeaf, WorkspaceRoot, WorkspaceFloating, View, TFile, PaneType, WorkspaceTabs,
    WorkspaceItem, Platform, Keymap,
} from 'obsidian';
import * as monkeyAround from 'monkey-around';
import { OpenTabSettingsPluginSettingTab, OpenTabSettingsPluginSettings, DEFAULT_SETTINGS } from './settings';
import { PaneTypePatch, TabGroup } from './types';


/**
 * Special view types added by plugins that should be deduplicated like normal files.
 * This is only needed if the view is not registered as the default view for a file extension.
 */
const PLUGIN_VIEW_TYPES: Record<string, string[]> = {
    "md": ["excalidraw", "kanban"],
}

const UNSET = Symbol("unset")


function isEmptyLeaf(leaf: WorkspaceLeaf) {
    // home-tab plugin replaces new tab with home tabs, which should be treated like empty.
    return ["empty", "home-tab-view"].includes(leaf.view.getViewType())
}

/** Check if leaf is in the main area (e.g. not in sidebar etc) */
function isMainLeaf(leaf: WorkspaceLeaf) {
    const root = leaf.getRoot();
    return (root instanceof WorkspaceRoot || root instanceof WorkspaceFloating);
}


export default class OpenTabSettingsPlugin extends Plugin {
    settings: OpenTabSettingsPluginSettings = {...DEFAULT_SETTINGS};

    async onload() {
        await this.loadSettings();

        this.addSettingTab(new OpenTabSettingsPluginSettingTab(this.app, this));

        this.registerMonkeyPatches();

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

        const commands = [
            ["openInNewTab", "always open in new tab"],
            ["deduplicateTabs", "prevent duplicate tabs"],
        ] as const;
        for (const [setting, name] of commands) {
            const id = setting.replace(/[A-Z]/g, l => `-${l.toLowerCase()}`)
            this.addCommand({
                id: `toggle-${id}`, name: `Toggle ${name}`,
                callback: async () => {
                    await this.updateSettings({[setting]: !this.settings[setting]});
                },
            });
            this.addCommand({
                id: `enable-${id}`, name: `Enable ${name}`,
                callback: async () => {
                    await this.updateSettings({[setting]: true});
                },
            });
            this.addCommand({
                id: `disable-${id}`, name: `Disable ${name}`,
                callback: async () => {
                    await this.updateSettings({[setting]: false});
                },
            });
        }
    }

    registerMonkeyPatches() {
        const plugin = this;
        const oldGetUnpinnedLeaf = this.app.workspace.getUnpinnedLeaf; // eslint-disable-line @typescript-eslint/unbound-method

        // Patch getLeaf to always open in new tab
        this.register(monkeyAround.around(Workspace.prototype, {
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
                        // if focusNewTab is set, set to active like default Obsidian behavior. We also always focus
                        // new tabs created by normal click regardless of focusNewTab
                        if (plugin.app.vault.getConfig('focusNewTab') || isDefaultNewTab) {
                            plugin.app.workspace.setActiveLeaf(leaf);
                        }
                    } else if (newLeaf == "same") {
                            // avoid recursion in getLeaf. Add check for if getUnpinnedLeaf is removed
                        if (plugin.settings.openInNewTab && oldGetUnpinnedLeaf) {
                            leaf = oldGetUnpinnedLeaf.call(this);
                        } else {
                            leaf = oldMethod.call(this, false, ...args);
                        }
                    } else {
                        leaf = oldMethod.call(this, newLeaf, ...args);
                    }


                    // We set this so we can avoid deduplicating if the pane was opened via explicit new tab
                    leaf.openTabSettingsLastOpenType = newLeaf;

                    return leaf;
                }
            },

            // getUnpinnedLeaf is deprecated in favor of getLeaf(false). Obsidian doesn't use getUnpinnedLeaf anywhere
            // except inside getLeaf, but some plugins still use it directly so we'll patch it as well.
            getUnpinnedLeaf(oldMethod: any) {
                return function(this: Workspace, ...args) {
                    if (plugin.settings.openInNewTab) {
                        return plugin.app.workspace.getLeaf("tab");
                    } else {
                        return oldMethod.call(this, ...args);
                    }
                }
            },
        }));

        // Patch openFile to deduplicate tabs
        this.register(monkeyAround.around(WorkspaceLeaf.prototype, {
            openFile(oldMethod: any) {
                return async function(this: WorkspaceLeaf, file, openState, ...args) {
                    // openFile doesn't return anything, but just in case that changes.
                    let result: any = UNSET;

                    // if the leaf is new (empty) and was opened via an explicit open in new window or split, don't
                    // deduplicate. Note that opening in new window doesn't call getLeaf (it calls openPopoutLeaf
                    // directly) so we assume undefined lastOpenType is a new window. getLeaf("same") will update
                    // lastOpenType, so we shouldn't need to worry about if lastOpenType is undefined because the leaf
                    // was created before the plugin was loaded or such.
                    const isSpecialOpen = isEmptyLeaf(this) && (
                        !this.openTabSettingsLastOpenType ||
                        !['same', 'tab'].includes(this.openTabSettingsLastOpenType)
                    );
                    if (plugin.settings.deduplicateTabs && isMainLeaf(this) && !isSpecialOpen) {
                        // Check if there are any duplicate tabs
                        const matches = plugin.findMatchingLeaves(file);
                        if (!matches.includes(this) && matches.length > 0) {
                            if (matches[0].view.getViewType() == "kanban" && openState?.active) {
                                // workaround for a bug in kanban. See
                                //     https://github.com/jesse-r-s-hines/obsidian-open-tab-settings/issues/25
                                //     https://github.com/mgmeyers/obsidian-kanban/issues/1102
                                this.app.workspace.setActiveLeaf(matches[0]);
                                result = undefined;
                            } else {
                                const activeLeaf = plugin.app.workspace.getActiveViewOfType(View)?.leaf;
                                result = await oldMethod.call(matches[0], file, {
                                    ...openState,
                                    active: !!openState?.active || activeLeaf == this,
                                }, ...args);
                            }
                        }
                    }

                    if (result == UNSET) { // use default behavior
                        result = await oldMethod.call(this, file, openState, ...args);
                    }

                    // If the leaf is still empty, close it. This can happen if the file was de-duplicated while
                    // "openInNewTab" is enabled, or if you open a file "in default app" in a new tab.
                    if (isEmptyLeaf(this) && this.parent.children.length > 1) {
                        this.detach();
                    }
                    return result;
                }
            },
        }));

        // Patch isModEvent to open in same tab
        // We could actually just patch isModEvent instead of getLeaf for most cases, but there's quite a few places
        // that call getLeaf without isModEvent, such as the graph view.
        this.register(monkeyAround.around(Keymap, {
            isModEvent(oldMethod: any) {
                return function(this: any, ...args) {
                    let result = oldMethod.call(this, ...args);
                    if (plugin.settings.openInNewTab && plugin.settings.openInSameTabOnModClick && result == 'tab') {
                        result = 'same';
                    }
                    return result;
                }
            },
        }));
    }

    async loadSettings() {
        const dataFile = await this.loadData() ?? {};
        this.settings = Object.assign({}, DEFAULT_SETTINGS, dataFile);

        if (Object.keys(dataFile).length == 0) {
            // when using this plugin, focusNewTab should default to false. Set it if this is the first time we've
            // loaded the plugin.
            this.app.vault.setConfig('focusNewTab', false);
            await this.updateSettings({});
        }
    }

    async updateSettings(settings: Partial<OpenTabSettingsPluginSettings>) {
        Object.assign(this.settings, settings);
        await this.saveData(this.settings);
    }

    private findMatchingLeaves(file: TFile) {
        const matches: WorkspaceLeaf[] = [];
        this.app.workspace.iterateAllLeaves(leaf => {
            // file is the same
            const isFileMatch = leaf.getViewState()?.state?.file == file.path;
            // we only want to switch to another leaf if its a basic file, not if its outgoing-links etc.
            const viewType = leaf.view.getViewType();
            const isTypeMatch = (
                this.app.viewRegistry.getTypeByExtension(file.extension) == viewType ||
                PLUGIN_VIEW_TYPES[file.extension]?.includes(viewType)
            );

            if (isMainLeaf(leaf) && isFileMatch && isTypeMatch) {
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
        if (isEmptyLeaf(activeLeaf)) {
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
        if (isEmptyLeaf(leafToDisplace)) {
            newLeaf = leafToDisplace;
        } else {
            newLeaf = new (WorkspaceLeaf as any)(this.app);
            dest.insertChild(index, newLeaf);
        }

        return newLeaf;
    }
}
