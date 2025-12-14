import {
    Plugin, Workspace, WorkspaceLeaf, WorkspaceRoot, WorkspaceFloating, View, TFile, PaneType, WorkspaceTabs,
    WorkspaceItem, Platform, Keymap, Notice,
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


function isEmptyLeaf(leaf: WorkspaceLeaf) {
    // home-tab plugin replaces new tab with home tabs, which should be treated like empty.
    return ["empty", "home-tab-view"].includes(leaf.view.getViewType())
}

/** Check if leaf is in the main area (e.g. not in sidebar etc) */
function isMainLeaf(leaf: WorkspaceLeaf) {
    const root = leaf.getRoot();
    return (root instanceof WorkspaceRoot || root instanceof WorkspaceFloating);
}

function capitalize(s: string) {
    return s[0].toUpperCase() + s.slice(1);
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
                    if (this.settings.openInNewTab) {
                        menu.addItem((item) => {
                            item.setSection("open");
                            item.setIcon("file-minus")
                            item.setTitle("Open in same tab");
                            item.onClick(async () => {
                                await this.app.workspace.getLeaf('same' as PaneType).openFile(file);
                            });
                        });
                    }
                    if (this.settings.deduplicateTabs && this.findMatchingLeaves(file).length > 0) {
                        menu.addItem((item) => {
                            item.setSection("open");
                            item.setIcon("files")
                            item.setTitle("Open in duplicate tab");
                            item.onClick(async () => {
                                await this.app.workspace.getLeaf('allow-duplicate' as PaneType).openFile(file);
                            });
                        });
                    }
                }
            })
        );

        const commands = [
            ["openInNewTab", "always open in new tab"],
            ["deduplicateTabs", "prevent duplicate tabs"],
        ] as const;
        for (const [setting, name] of commands) {
            const id = setting.replace(/[A-Z]/g, l => `-${l.toLowerCase()}`);

            this.addCommand({
                id: `toggle-${id}`, name: `Toggle ${name}`,
                callback: async () => {
                    await this.updateSettings({[setting]: !this.settings[setting]});
                    new Notice(`${capitalize(name)} ${this.settings[setting] ? 'ON' : 'OFF'}`, 2500);
                },
            });
            this.addCommand({
                id: `enable-${id}`, name: `Enable ${name}`,
                callback: async () => {
                    await this.updateSettings({[setting]: true});
                    new Notice(`${capitalize(name)} ${this.settings[setting] ? 'ON' : 'OFF'}`, 2500);
                },
            });
            this.addCommand({
                id: `disable-${id}`, name: `Disable ${name}`,
                callback: async () => {
                    await this.updateSettings({[setting]: false});
                    new Notice(`${capitalize(name)} ${this.settings[setting] ? 'ON' : 'OFF'}`, 2500);
                },
            });
        }
    }

    registerMonkeyPatches() {
        const plugin = this;

        this.register(monkeyAround.around(Workspace.prototype, {
            /**
             * Patch getLeaf to open leaves in new tab by default, based on settings.
             */
            getLeaf(oldMethod: any) {
                return function(this: Workspace, newLeaf?: PaneTypePatch|boolean, ...args) {
                    const activeLeaf = this.getActiveViewOfType(View)?.leaf;

                    let implicitOpen = !newLeaf || newLeaf == "allow-duplicate";
                    const allowDuplicate = newLeaf == "allow-duplicate";
                    // resolve newLeaf to enum
                    if (newLeaf == true) {
                        newLeaf = 'tab';
                    } else if (!newLeaf || newLeaf == "allow-duplicate") {
                        newLeaf = plugin.settings.openInNewTab ? 'tab' : 'same';
                    }

                    let leaf: WorkspaceLeaf;
                    if (newLeaf == 'tab') {
                        // Tabs opened via normal click are always focused regardless of focusNewTab setting.
                        leaf = plugin.createNewLeaf(implicitOpen ? true : undefined);
                    } else if (newLeaf == "same") {
                        leaf = plugin.getUnpinnedLeaf();
                    } else {
                        leaf = oldMethod.call(this, newLeaf, ...args);
                    }

                    // we set these to be used in openFile so we can tell when to deduplicate files.
                    leaf.openTabSettings = {
                        openType: newLeaf, implicitOpen, allowDuplicate,
                        openedFrom: activeLeaf?.id,
                    }

                    return leaf;
                }
            },

            /**
             * getUnpinnedLeaf is deprecated in favor of getLeaf(false). However, it is used in a couple places in
             * Obsidian and many plugins still use it directly. So we'll patch it as well to enforce new tab behavior.
             *
             * Note that as of 1.9.10, getUnpinnedLeaf takes an undocumented "focus" boolean. Obsidian uses this param
             * when using ctrl and arrow keys in the file explorer to open files.
             */
            getUnpinnedLeaf(oldMethod: any) {
                return function(this: Workspace, focus?: boolean, ...args) {
                    if (plugin.settings.openInNewTab) {
                        return this.getLeaf("tab");
                    } else {
                        return plugin.getUnpinnedLeaf(focus, ...args);
                    }
                }
            },
        }));

        // Patch openFile to deduplicate tabs
        this.register(monkeyAround.around(WorkspaceLeaf.prototype, {
            openFile(oldMethod: any) {
                return async function(this: WorkspaceLeaf, file, openState, ...args) {
                    // openFile doesn't return anything, but just in case that changes.
                    let result: any;
                    let match: WorkspaceLeaf|undefined;

                    // these values are only valid immediately after creating a leaf. We clear them after openFile,
                    // and also clear them here if the leaf somehow gets populated without openFile
                    if (!isEmptyLeaf(this)) delete this.openTabSettings;

                    const {openType, allowDuplicate, implicitOpen, openedFrom} = this.openTabSettings ?? {};
                    const matches = plugin.findMatchingLeaves(file);

                    // if leaf is new and was opened via an explicit open in new window, split, or "allow duplicate",
                    // don't deduplicate. Note that opening in new window doesn't call getLeaf (it calls openPopoutLeaf
                    // directly) so we assume undefined openType is a new window. getLeaf("same") will update openType,
                    // so we shouldn't need to worry about if openType is undefined because the leaf was created before
                    // the plugin was loaded or such.
                    const isSpecialOpen = (
                        !isMainLeaf(this) ||
                        (isEmptyLeaf(this) && !['same', 'tab'].includes(openType ?? 'unknown')) ||
                        allowDuplicate
                    );
                    const isInternalLink = (
                        plugin.settings.openInNewTab && implicitOpen &&
                        isEmptyLeaf(this) &&
                        !!openState?.eState?.subpath &&
                        matches.some(l => l.id == openedFrom)
                    );
                    const isMatch = matches.includes(this);

                    // if the link opened was an internal link, always deduplicate to undo open in new tab.
                    if (isInternalLink && !isSpecialOpen && !isMatch) {
                        match = matches.find(l => l.id == openedFrom)!;
                    } else if (plugin.settings.deduplicateTabs && !isSpecialOpen && matches.length > 0 && !isMatch) {
                        // choose matches first from last opened from, then matches in same group, then fist in list.
                        match = matches.find(l => l.id == openedFrom);
                        if (!match) matches.find(l => l.parent == this.parent);
                        if (!match) match = matches[0];
                    }

                    if (match) {
                        if (match.view.getViewType() == "kanban") {
                            // workaround for a bug in kanban. See
                            //     https://github.com/jesse-r-s-hines/obsidian-open-tab-settings/issues/25
                            //     https://github.com/mgmeyers/obsidian-kanban/issues/1102
                            plugin.app.workspace.setActiveLeaf(matches[0]);
                            result = undefined;
                        } else {
                            const activeLeaf = plugin.app.workspace.getActiveViewOfType(View)?.leaf;
                            result = await oldMethod.call(matches[0], file, {
                                ...openState,
                                active: !!openState?.active || activeLeaf == this,
                            }, ...args);
                        }
                    } else { // use default behavior
                        result = await oldMethod.call(this, file, openState, ...args);
                    }

                    // If the leaf is still empty, close it. This can happen if the file was de-duplicated while
                    // "openInNewTab" is enabled, or if you open a file "in default app" in a new tab.
                    if (isEmptyLeaf(this) && this.parent.children.length > 1) {
                        this.detach();
                    }

                    delete this.openTabSettings;

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
                    if (result == "tab") {
                        result = plugin.settings.modClickBehavior;
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
        return [...tabGroups];
    }

    /**
     * Custom variant of the internal workspace.createLeafInTabGroup function that follows our new tab placement logic.
     * @param focus Whether to focus the new tab. If undefined focus based on focusNewTab config
     */
    private createNewLeaf(focus?: boolean) {
        const plugin = this;
        const workspace = plugin.app.workspace;
        focus = focus ?? plugin.app.vault.getConfig('focusNewTab') as boolean;

        const activeLeaf = workspace.getMostRecentLeaf();
        if (!activeLeaf) throw new Error("No tab group found.");
        const activeTabGroup = activeLeaf.parent;
        const activeIndex = activeTabGroup.children.indexOf(activeLeaf);

        // This is default Obsidian behavior, if active leaf is empty new tab replaces it instead of making a new one.
        if (isEmptyLeaf(activeLeaf)) {
            return activeLeaf;
        }

        let group: TabGroup|undefined;
        let index: number|undefined;

        if (plugin.settings.newTabTabGroupPlacement != "same" && !Platform.isPhone) {
            const tabGroups = plugin.getAllTabGroups(activeLeaf.getRoot());
            const otherTabGroup = tabGroups.filter(g => g !== activeTabGroup).at(-1);
            if (plugin.settings.newTabTabGroupPlacement == "opposite" && otherTabGroup) {
                group = otherTabGroup;
            } else if (plugin.settings.newTabTabGroupPlacement == "first" && tabGroups.at(0)) {
                group = tabGroups[0];
            } else if (plugin.settings.newTabTabGroupPlacement == "last" && tabGroups.at(-1)) {
                group = tabGroups.at(-1)!;
            }
        }
        if (!group) {
            group = activeTabGroup;
        }

        if (group == activeTabGroup) {
            if (plugin.settings.newTabPlacement == "after-pinned") {
                const lastPinnedIndex = group.children.findLastIndex(l => l.pinned);
                index = lastPinnedIndex >= 0 ? lastPinnedIndex + 1 : activeIndex + 1;
            } else if (plugin.settings.newTabPlacement == "beginning") {
                index = 0;
            } else if (plugin.settings.newTabPlacement == "end") {
                index = activeTabGroup.children.length;
            } else {
                index = activeIndex + 1;
            }
        } else {
            if (plugin.settings.newTabPlacement == "beginning") {
                index = 0
            } else {
                index = activeTabGroup.children.length;
            }
        }

        let newLeaf: WorkspaceLeaf;
        // we re-use empty tabs more aggressively than default Obsidian. If the tab at the new location is empty, re-use
        // it instead of creating a new one.
        const leafToDisplace = group.children[Math.min(index, group.children.length - 1)];
        if (isEmptyLeaf(leafToDisplace)) {
            newLeaf = leafToDisplace;
        } else {
            newLeaf = new (WorkspaceLeaf as any)(this.app);
            const currentTab = group.currentTab;
            // If new tab is inserted before the currently tab in a group, and we aren't setting the new tab active, we
            // need to update the selected tab so that group.currentTab index still points to the original active tab
            group.insertChild(index, newLeaf);
            if (index <= currentTab && (group != activeTabGroup || !focus)) {
                group.selectTabIndex(currentTab + 1);
            }
        }

        if (focus) {
            workspace.setActiveLeaf(newLeaf);
        }

        return newLeaf;
    }

    /**
     * Custom implementation of getUnpinnedLeaf that implements our new tab placement behavior when making new tabs,
     * e.g. when the active tab is pinned.
     */
    private getUnpinnedLeaf(focus = true) {
        const plugin = this;
        const workspace = plugin.app.workspace;

        const activeLeaf = workspace.activeLeaf;
        if (activeLeaf?.canNavigate()) {
            return activeLeaf;
        }

        const container = activeLeaf?.getContainer() ?? workspace.rootSplit;

        let leaf: WorkspaceLeaf|null = null;
        workspace.iterateLeaves(container, (l) => {
          if (l.canNavigate()) {
            const group = l.parent;
            if (
                group &&
                (group.children[group.currentTab] === l || (group instanceof WorkspaceTabs && group.isStacked)) &&
                (!leaf || leaf.activeTime < l.activeTime)
            ) {
              leaf = l;
            }
          }
        });

        if (!leaf) {
            leaf = plugin.createNewLeaf(focus);
        } else if (focus) {
            workspace.setActiveLeaf(leaf);
        }

        return leaf;
    }
}
