import {
    Plugin, Workspace, WorkspaceLeaf, WorkspaceRoot, WorkspaceFloating, View, TFile, PaneType, WorkspaceTabs,
    WorkspaceItem, Platform, Keymap, Notice, App, MarkdownView,
} from 'obsidian';
import * as monkeyAround from 'monkey-around';
import {
    OpenTabSettingsPluginSettingTab, OpenTabSettingsPluginSettings, DEFAULT_SETTINGS, NEW_TAB_TAB_GROUP_PLACEMENTS,
    DISABLED_KEY,
} from './settings';
import { TabGroup } from './types';
import { initializeI18n } from './i18n';
import { t } from 'i18next';


/**
 * Special view types added by plugins that should be deduplicated like normal files.
 * This is only needed if the view is not registered as the default view for a file extension.
 */
const PLUGIN_VIEW_TYPES: Record<string, string[]> = {
    "md": ["excalidraw", "kanban", "smm"],
}


function isEmptyLeaf(leaf: WorkspaceLeaf) {
    // home-tab plugin replaces new tab with home tabs, which should be treated like empty.
    return ["empty", "home-tab-view"].includes(leaf.view.getViewType())
}

/** Check if leaf is in the main area (e.g. not in sidebar etc) */
function isMainLeaf(leaf: WorkspaceLeaf) {
    const root = leaf.getRoot();
    // parent can be null on detached leaves. Obsidian never calls openFile on a detached leaf, but some plugins seem to
    // see issue #80
    return (root instanceof WorkspaceRoot || root instanceof WorkspaceFloating) && leaf.parent;
}

/**
 * This is a bit hacky, but to support easily changing our settings in Mod click or menu items we're sticking the
 * overrides onto the string passed to getLeaf.
 */
function buildOverride(mode: PaneType|false, settings: Partial<OpenTabSettingsPluginSettings>) {
    return `${mode || ""}:${JSON.stringify(settings)}` as PaneType; // Deceptive cast to allow passing to getLeaf
}


function camelCase(s: string) { return s.replace(/[-_]\w/g, x => x[1].toUpperCase()); }
function kebabCase(s: string) { return s.replace(/[A-Z]/g, x => `-${x.toLowerCase()}`); }


function parseOverride(override?: string|boolean): [PaneType|false, Partial<OpenTabSettingsPluginSettings>] {
    if (!override) {
        return [false, {}];
    } else if (override === true) {
        return ['tab', {}];
    } else {
        const [mode, ...rest] = override.split(":");
        const json = rest.join(":") || "{}";
        return [(mode || false) as PaneType|false, JSON.parse(json) as Partial<OpenTabSettingsPluginSettings>];
    }
}

const OVERRIDES = {
    tab: "tab",
    same: buildOverride(false, {openInNewTab: false}),
    allowDuplicate: buildOverride(false, {deduplicateTabs: false}),
    opposite: buildOverride("tab", {newTabTabGroupPlacement: "opposite"}),
    noPreview: buildOverride("tab", {previewTabs: false}),
    placeAfterActive: buildOverride('tab', {newTabPlacement: "afterActive"}),
    placeAtBeginning: buildOverride('tab', {newTabPlacement: "beginning"}),
    placeAtEnd: buildOverride('tab', {newTabPlacement: "end"}),
}

export default class OpenTabSettingsPlugin extends Plugin {
    settings: OpenTabSettingsPluginSettings = {...DEFAULT_SETTINGS};

    async onload() {
        await initializeI18n();

        await this.loadSettings();

        this.addSettingTab(new OpenTabSettingsPluginSettingTab(this.app, this));

        if (this.app.loadLocalStorage(DISABLED_KEY)) {
            return;
        }

        this.registerMonkeyPatches();
        this.registerCommands();
        this.registerFileMenuOptions();
        this.registerPreviewTabsEvents();
    }

    registerMonkeyPatches() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- can't use arrow functions here
        const plugin = this;

        this.register(monkeyAround.around(Workspace.prototype, {
            /**
             * Patch getLeaf to open leaves in new tab by default, based on settings.
             */
            getLeaf(oldMethod) {
                return function(this: Workspace, openModeIn?: string|boolean, ...args) {
                    const [openMode, override] = parseOverride(openModeIn);
                    const settings = {...plugin.settings, ...override};
                    const activeLeaf = this.getActiveViewOfType(View)?.leaf;

                    let leaf: WorkspaceLeaf;
                    if (openMode == 'tab' || (!openMode && settings.openInNewTab)) {
                        // Tabs opened via normal click are always focused regardless of focusNewTab setting.
                        leaf = plugin.createNewLeaf(!openMode ? true : undefined, settings);
                    } else if (!openMode) {
                        leaf = plugin.getUnpinnedLeaf(true, settings);
                    } else {
                        leaf = (oldMethod as (...args: unknown[]) => WorkspaceLeaf).call(this, openMode, ...args);
                    }

                    // we set these to be used in openFile so we can tell when to deduplicate files.
                    leaf.openTabSettings = {
                        ...leaf.openTabSettings,
                        openInfo: { openMode, override, openedFrom: activeLeaf?.id },
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
            getUnpinnedLeaf(oldMethod) {
                return function(this: Workspace, focus?: boolean) {
                    if (plugin.settings.openInNewTab) {
                        return this.getLeaf("tab");
                    } else {
                        return plugin.getUnpinnedLeaf(focus);
                    }
                }
            },
        }));

        // Patch openFile to deduplicate tabs
        this.register(monkeyAround.around(WorkspaceLeaf.prototype, {
            openFile(oldMethod) {
                return async function(this: WorkspaceLeaf, file, openState, ...args) {
                    // openFile doesn't return anything, but just in case that changes.
                    let result: void;

                    // these values are only valid immediately after creating a leaf. We clear them after openFile,
                    // and also clear them here if the leaf somehow gets populated without openFile
                    if (!isEmptyLeaf(this)) delete this.openTabSettings?.openInfo;

                    const {openMode, override, openedFrom} = this.openTabSettings?.openInfo ?? {};
                    const settings = {...plugin.settings, ...override};

                    let matches = plugin.findMatchingLeaves(file);
  
                    // if leaf is new and was opened via an explicit open in new window, split, or "allow duplicate",
                    // don't deduplicate. Note that opening in new window doesn't call getLeaf (it calls openPopoutLeaf
                    // directly) so we assume undefined openType is a new window. getLeaf("same") will update openType,
                    // so we shouldn't need to worry about if openType is undefined because the leaf was created before
                    // the plugin was loaded or such.
                    const isSpecialOpen = (
                        !isMainLeaf(this) ||
                        (isEmptyLeaf(this) && ![false, "tab"].includes(openMode ?? 'unknown'))
                    );
                    const isInternalLink = (
                        isEmptyLeaf(this) && openMode === false &&
                        !!openState?.eState?.subpath &&
                        matches.some(l => l.id == openedFrom)
                    );

                    let target: WorkspaceLeaf|undefined;
                    // eslint-disable-next-line @typescript-eslint/no-this-alias -- target
                    if (matches.includes(this)) target = this;
                    // if the link opened was an internal link, always deduplicate to undo open in new tab.
                    if (!target && isInternalLink && !isSpecialOpen) {
                        target = matches.find(l => l.id == openedFrom)!;
                    }
                    if (!settings.deduplicateAcrossTabGroups) {
                        matches = matches.filter(l => l.parent == this.parent);
                    }
                    // choose matches first from last opened from, then matches in same group, then first in list.
                    if (settings.deduplicateTabs && !isSpecialOpen && matches.length > 0) {
                        if (!target) target = matches.find(l => l.id == openedFrom);
                        // match that is already displayed in this group
                        if (!target) target = matches.find(l => l.isVisible() && l.parent == this.parent);
                        // match that is already displayed in another group
                        if (!target) target = matches.find(l => l.isVisible());
                        // matches in same group
                        if (!target) target = matches.find(l => l.parent == this.parent);
                        // first match in list
                        if (!target) target = matches[0];
                    }
                    // eslint-disable-next-line @typescript-eslint/no-this-alias -- target
                    if (!target) target = this;

                    target.openTabSettings = {...target.openTabSettings, openedTime: performance.now()};

                    if (target !== this) {
                        if (target.view.getViewType() == "kanban") {
                            // workaround for a bug in kanban. See
                            //     https://github.com/jesse-r-s-hines/obsidian-open-tab-settings/issues/25
                            //     https://github.com/mgmeyers/obsidian-kanban/issues/1102
                            plugin.app.workspace.setActiveLeaf(target);
                            result = undefined;
                        } else {
                            const activeLeaf = plugin.app.workspace.getActiveViewOfType(View)?.leaf;
                            result = await oldMethod.call(target, file, {
                                ...openState,
                                active: !!openState?.active || activeLeaf == this,
                            }, ...args);
                        }
                    } else { // use default behavior
                        result = await oldMethod.call(target, file, openState, ...args);
                    }

                    // If the leaf is still empty, close it. This can happen if the file was de-duplicated while
                    // "openInNewTab" is enabled, or if you open a file "in default app" in a new tab.
                    if (isEmptyLeaf(this) && isMainLeaf(this) && this.parent.children.length > 1) {
                        // WorkspaceMobileDrawer is the "sidebar" on mobile, so isMainLeaf avoids it
                        const tabGroup = this.parent as TabGroup;
                        const wasCurrentTab = tabGroup.children[tabGroup.currentTab] === this;
                        const lastActiveTab = tabGroup.children
                            .filter(l => l !== this)
                            .reduce((max, l) => l.activeTime > max.activeTime ? l : max);
                        this.detach();
                        if (wasCurrentTab) {
                            tabGroup.selectTabIndex(tabGroup.children.findIndex(c => c === lastActiveTab));
                        }
                    }

                    delete this.openTabSettings?.openInfo;

                    return result;
                }
            },
        }));

        // Patch isModEvent to add override settings
        // We could have used isModEvent to implement openInNewTab instead of getLeaf, but there's quite a few places
        // that call getLeaf without isModEvent, such as the graph view.
        this.register(monkeyAround.around(Keymap, {
            isModEvent(oldMethod) {
                return function(this: Keymap, ...args) {
                    let result = oldMethod.call(this, ...args);
                    if (result == "tab") {
                        result = OVERRIDES[plugin.settings.modClickBehavior] as boolean|PaneType;
                    }
                    return result;
                }
            },
        }));
    }

    registerCommands() {
        const commands = [
            ["openInNewTab", t('settings.openInNewTab.name')],
            ["deduplicateTabs", t('settings.deduplicateTabs.name')],
        ] as const;
        for (const [setting, name] of commands) {
            this.addCommand({
                id: `toggle-${kebabCase(setting)}`, name: t('commands.toggle', { name }),
                callback: async () => {
                    await this.updateSettings({[setting]: !this.settings[setting]});
                    new Notice(`${name}: ` + t(`commands.${this.settings[setting] ? 'enabled' : 'disabled'}`), 2500);
                },
            });
            this.addCommand({
                id: `enable-${kebabCase(setting)}`, name: t('commands.enable', { name }),
                callback: async () => {
                    await this.updateSettings({[setting]: true});
                    new Notice(`${name}: ` + t(`commands.${this.settings[setting] ? 'enabled' : 'disabled'}`), 2500);
                },
            });
            this.addCommand({
                id: `disable-${kebabCase(setting)}`, name: t('commands.disable', { name }),
                callback: async () => {
                    await this.updateSettings({[setting]: false});
                    new Notice(`${name}: ` + t(`commands.${this.settings[setting] ? 'enabled' : 'disabled'}`), 2500);
                },
            });
        }
        this.addCommand({
            id: "cycle-tab-group-placement",
            name: t('commands.cycle', {name: t('settings.newTabTabGroupPlacement.name')}),
            callback: async () => {
                const values = Object.keys(NEW_TAB_TAB_GROUP_PLACEMENTS) as (keyof typeof NEW_TAB_TAB_GROUP_PLACEMENTS)[];
                const index = values.findIndex(v => v == this.settings.newTabTabGroupPlacement);
                const newValue = values[(index + 1) % values.length];
                await this.updateSettings({newTabTabGroupPlacement: newValue});
                new Notice(`${t('settings.newTabTabGroupPlacement.name')}: ${t(NEW_TAB_TAB_GROUP_PLACEMENTS[newValue])}`, 2500);
            },
        });
        // workspace:new-tab doesn't respect new tab placement options, so add some custom commands
        for (const p of ["afterPinned", "afterActive", "beginning"] as const) {
            this.addCommand({
                id: "new-tab-" + kebabCase(p),
                name: t(`commands.newTab.${p}`),
                callback: () => { this.createNewLeaf(true, {newTabPlacement: p, replaceEmptyTabs: false}); },
            })
        }
    }

    registerFileMenuOptions() {
        this.registerEvent(this.app.workspace.on("file-menu", (menu, file, source, leaf) => {
            if (file instanceof TFile) {
                if (this.settings.openInNewTab) {
                    menu.addItem((item) => {
                        item.setSection("open");
                        item.setIcon("file-minus")
                        item.setTitle(t('menu.openInSameTab'));
                        item.onClick(async () => {
                            await this.app.workspace.getLeaf(OVERRIDES.same).openFile(file);
                        });
                    });
                }
                if (this.settings.deduplicateTabs && this.findMatchingLeaves(file).length > 0) {
                    menu.addItem((item) => {
                        item.setSection("open");
                        item.setIcon("files")
                        item.setTitle(t('menu.openInDuplicateTab'));
                        item.onClick(async () => {
                            await this.app.workspace.getLeaf(OVERRIDES.allowDuplicate).openFile(file);
                        });
                    });
                }
                const activeLeaf = this.app.workspace.getMostRecentLeaf();
                if (activeLeaf && this.getAllTabGroups(activeLeaf.getRoot()).length > 1) {
                    menu.addItem((item) => {
                        item.setSection("open");
                        item.setIcon("lucide-split-square-horizontal")
                        item.setTitle(t('menu.openInOppositeTabGroup'));
                        item.onClick(async () => {
                            await this.app.workspace.getLeaf(OVERRIDES.opposite).openFile(file);
                        });
                    });
                }
            }
        }));
    }

    registerPreviewTabsEvents() {
        this.registerEvent(this.app.workspace.on("editor-change", (editor, info) => {
            if (info instanceof MarkdownView) {
                this.setLeafIsPreview(info.leaf, false);
            }
        }));
        this.registerEvent(this.app.workspace.on("layout-change", this.syncPreviewTabs));

        // handler so we can get the first click time of a dblclick event. Use window and capture: true to make sure
        // it runs first and doesn't get stopPropagate from another plugin
        let clickTimes: number[] = [];
        const windowClickHandler = (e: MouseEvent) => {
            clickTimes.push(e.timeStamp);
            if (clickTimes.length > 2) clickTimes.shift();
        }
        const windowDblClickHandler = (e: MouseEvent) => {
            const target = e.target as Element|null;
            if (!this.settings.previewTabs || !target?.instanceOf?.(Element)) return;

            const tabHeader = target.closest(".workspace-tab-header");
            if (tabHeader) {
                this.app.workspace.iterateAllLeaves(l => {
                    if (l.tabHeaderEl == tabHeader) {
                        this.setLeafIsPreview(l, false);
                    }
                })
                return;
            }

            // file explorer doesn't call openFile if file is already active, so to allow dblclick of active file to still work
            // handle it explicitly here
            const fileExplorerFile = target.closest('.nav-files-container .nav-file-title[data-path]')?.getAttr("data-path");
            if (fileExplorerFile) {
                const leaf = this.app.workspace.getMostRecentLeaf();
                if (leaf?.getViewState()?.state?.file == fileExplorerFile) {
                    this.setLeafIsPreview(leaf, false);
                }
                return;
            }

            // otherwise, try to detect if a file has opened within the dbclick

            const firstClick = clickTimes.length >= 2 && e.timeStamp - clickTimes[1] < 15 ? clickTimes[0] : undefined;
            // its possible for the "click" handler to get skipped if another `capture: true` click event calls
            // preventPropagation, which would give incorrect firstClick.
            if (firstClick) {
                const opened: WorkspaceLeaf[] = [];
                this.app.workspace.iterateAllLeaves(leaf => {
                    if (isMainLeaf(leaf) && (leaf.openTabSettings?.openedTime ?? 0) >= firstClick) {
                        opened.push(leaf);
                    }
                });
                if (opened.length == 1) {
                    this.setLeafIsPreview(opened[0], false);
                }
            }
        }

        for (const win of this.getAllWindows()) {
            win.addEventListener('click', windowClickHandler, {capture: true});
            win.addEventListener('dblclick', windowDblClickHandler);
        }
        this.registerEvent(this.app.workspace.on("window-open", (win) => {
            win.win.addEventListener('click', windowClickHandler, {capture: true});
            win.win.addEventListener('dblclick', windowDblClickHandler);
        }))

        // custom cleanup (can't use this.registerFoo on ephemeral dom elements as it memory leaks)
        this.register(() => {
            this.app.workspace.iterateAllLeaves(l => {
                this.setLeafIsPreview(l, false);
                delete l.openTabSettings;
            });
            for (const win of this.getAllWindows()) {
                win.removeEventListener('click', windowClickHandler, {capture: true});
                win.removeEventListener('dblclick', windowDblClickHandler);
            };
        })
    }

    async loadSettings() {
        const data = await this.loadData() as Record<string, unknown> ?? {};
        const originalData = JSON.stringify(data);
        for (const k of ['newTabPlacement', 'modClickBehavior']) { // backwards compatibility for before camelCase values
            if (k in data) data[k] = camelCase(data[k] as string);
        }
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

        if (Object.keys(data).length == 0) {
            // when using this plugin, focusNewTab should default to false. Set it if this is the first time we've
            // loaded the plugin.
            this.app.vault.setConfig('focusNewTab', false);
        }
    
        if (JSON.stringify(this.settings) != originalData) {
            await this.updateSettings({});
        }
    }

    async updateSettings(newSettings: Partial<OpenTabSettingsPluginSettings>) {
        const settings = {...this.settings, ...newSettings}

        if (settings.previewTabs == true && !settings.openInNewTab) {
            if (newSettings.previewTabs) throw Error(`Invalid settings: ${JSON.stringify(newSettings)}`)
            settings.previewTabs = false;
        }

        if (
            (settings.modClickBehavior == 'same' && !settings.openInNewTab) ||
            (settings.modClickBehavior == 'noPreview' && !settings.previewTabs) ||
            (settings.modClickBehavior == 'allowDuplicate' && !settings.deduplicateTabs) ||
            (settings.modClickBehavior == "placeAfterActive" && settings.newTabPlacement == "afterActive") ||
            (settings.modClickBehavior == "placeAtBeginning" && settings.newTabPlacement == "beginning") ||
            (settings.modClickBehavior == "placeAtEnd" && settings.newTabPlacement == "end")
        ) {
            if (newSettings.modClickBehavior) throw Error(`Invalid settings: ${JSON.stringify(newSettings)}`)
            settings.modClickBehavior = 'tab'
        }

        Object.assign(this.settings, settings);
        if (!this.settings.previewTabs) {
            this.app.workspace.iterateAllLeaves(l => this.setLeafIsPreview(l, false));
        }
        await this.saveData(this.settings);
    }

    private getAllWindows() {
        const windows = new Set([this.app.workspace.rootSplit?.win ?? window]);
        this.app.workspace.iterateAllLeaves(l => { windows.add(l.getContainer().win) });
        return [...windows];
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
     * Gets all tab groups under the given root. Excludes the sidebars (only works for main area and floating windows)
     */
    private getAllTabGroups(root: WorkspaceItem): TabGroup[] {
        const tabGroups: Set<TabGroup> = new Set(); // sets are ordered
        this.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.getRoot() == root) {
                tabGroups.add(leaf.parent as TabGroup);
            }
        });
        return [...tabGroups];
    }

    private setLeafIsPreview(leaf: WorkspaceLeaf, isPreview: boolean) {
        if (leaf.openTabSettings?.isPreview === isPreview) return;

        leaf.openTabSettings = {...leaf.openTabSettings, isPreview};
        leaf.tabHeaderEl.toggleClass("open-tab-settings-is-preview", isPreview);
        if (isPreview) {
            if (!leaf.openTabSettings.eventCleanup) {
                // I've confirmed that the events automatically get cleaned up when the leaf is closed. However we can't
                // use this.registerEvent as that prevents leaf garbage collection. So instead add a cleanup function to
                // the leaf. We'll call that on plugin disable, and after unpreview of a leaf
                leaf.on("pinned-change", this.syncPreviewTabs);
                leaf.openTabSettings.eventCleanup = () => {
                    leaf.off('pinned-change', this.syncPreviewTabs);
                };
            }
            // one preview tab per tab group (this shouldn't trigger under normal circumstances, but with empty tabs
            // there's a few edge cases where createNewLeaf might end up creating 2 preview tabs in a group)
            (leaf.parent as TabGroup).children.filter(l => l !== leaf).forEach(l => this.setLeafIsPreview(l, false));
        } else if (leaf.openTabSettings.eventCleanup) {
            leaf.openTabSettings.eventCleanup();
            delete leaf.openTabSettings?.eventCleanup;
        }
    }

    /** Removes preview from any pinned tabs or non main tabs */
    private syncPreviewTabs = () => {
        this.app.workspace.iterateAllLeaves(l => {
            if (!isMainLeaf(l) || l.pinned) {
                this.setLeafIsPreview(l, false);
            }
        })
    }

    /**
     * Custom variant of the internal workspace.createLeafInTabGroup function that follows our new tab placement logic.
     * @param focus Whether to focus the new tab. If undefined focus based on focusNewTab config
     */
    private createNewLeaf(focus?: boolean, override: Partial<OpenTabSettingsPluginSettings & {replaceEmptyTabs: boolean}> = {}) {
        const workspace = this.app.workspace;
        focus = focus ?? this.app.vault.getConfig('focusNewTab') as boolean;
        const settings = {...this.settings, replaceEmptyTabs: true, ...override};

        const activeLeaf = workspace.getMostRecentLeaf(); // will be in main area or floating window
        if (!activeLeaf) throw new Error("No tab group found.");
        const root = activeLeaf.getRoot();
        const activeTabGroup = activeLeaf.parent as TabGroup;
        let group: TabGroup|undefined;
        let index: number|undefined;

        if (settings.newTabTabGroupPlacement == "same" || Platform.isPhone) {
            group = activeTabGroup;
        } else {
            const tabGroups = this.getAllTabGroups(root);
            if (settings.newTabTabGroupPlacement == "opposite") {
                group = tabGroups.filter(g => g !== activeTabGroup).at(-1) ?? activeTabGroup;
            } else if (settings.newTabTabGroupPlacement == "first") {
                group = tabGroups.at(0) ?? activeTabGroup;
            } else  { // if (settings.newTabTabGroupPlacement == "last") {
                group = tabGroups.at(-1) ?? activeTabGroup;
            }
        }

        if (group == activeTabGroup) {
            if (settings.newTabPlacement == "afterPinned") {
                const lastPinnedIndex = group.children.findLastIndex(l => l.pinned);
                index = lastPinnedIndex >= 0 ? lastPinnedIndex + 1 : group.currentTab + 1;
            } else if (settings.newTabPlacement == "beginning") {
                index = 0;
            } else if (settings.newTabPlacement == "end") {
                index = group.children.length;
            } else { // if (settings.newTabPlacement == "afterActive") {
                index = group.currentTab + 1;
            }
        } else {
            if (settings.newTabPlacement == "beginning") {
                index = 0
            } else {
                index = group.children.length;
            }
        }

        let newLeaf: WorkspaceLeaf|undefined;

        // This is default Obsidian behavior, if active leaf is empty new tab replaces it instead of making a new one.
        if (settings.replaceEmptyTabs && isEmptyLeaf(activeLeaf) && activeLeaf.canNavigate()) {
            newLeaf = activeLeaf;
        }

        const leafToDisplace = group.children[Math.min(index, group.children.length - 1)];
        if (!newLeaf && settings.replaceEmptyTabs && isEmptyLeaf(leafToDisplace) && leafToDisplace.canNavigate()) {
            // we re-use empty tabs more aggressively than default Obsidian. If the tab at the new location is empty,
            // re-use it instead of creating a new one.
            newLeaf = leafToDisplace;
        }

        if (!newLeaf && settings.previewTabs) {
            // ignore index and use preview tab in group if there is one
            newLeaf = group.children.find(l => l.openTabSettings?.isPreview);
        }

        if (!newLeaf) {
            newLeaf = new (WorkspaceLeaf as new (app: App) => WorkspaceLeaf)(this.app);
            const currentTab = group.currentTab;
            // If new tab is inserted before the currently tab in a group, and we aren't setting the new tab active, we
            // need to update the selected tab so that group.currentTab index still points to the original active tab
            group.insertChild(index, newLeaf);
            if (index <= currentTab && (group != activeTabGroup || !focus)) {
                group.selectTabIndex(currentTab + 1);
            }
        }

        this.setLeafIsPreview(newLeaf, settings.previewTabs);
        if (focus) {
            workspace.setActiveLeaf(newLeaf);
        }

        return newLeaf;
    }

    /**
     * Custom implementation of getUnpinnedLeaf that implements our new tab placement behavior when making new tabs,
     * e.g. when the active tab is pinned.
     */
    private getUnpinnedLeaf(focus = true, override: Partial<OpenTabSettingsPluginSettings> = {}) {
        const workspace = this.app.workspace;
        const settings = {...this.settings, ...override};

        const activeLeaf = workspace.activeLeaf;
        if (activeLeaf?.canNavigate()) {
            return activeLeaf;
        }

        const container = activeLeaf?.getContainer() ?? workspace.rootSplit;

        let leaf: WorkspaceLeaf|null = null;
        workspace.iterateLeaves(container, (l) => {
          if (l.canNavigate()) {
            const group = l.parent as TabGroup;
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
            leaf = this.createNewLeaf(focus, settings);
        } else if (focus) {
            workspace.setActiveLeaf(leaf);
        }

        return leaf;
    }
}
