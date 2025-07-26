import { Key, ChainablePromiseElement } from 'webdriverio'
import { ConfigItem } from 'obsidian-typings'
import type { OpenTabSettingsPluginSettings } from "src/settings.js"
import { equals } from "@jest/expect-utils";
import { WorkspaceLeaf, WorkspaceParent } from 'obsidian';
import { obsidianPage } from 'wdio-obsidian-service';

type LeafInfo = {
    id: string,
    parent: string, root: string, container: string,
    type: string, file: string,
    deferred: boolean, pinned: boolean,
    active: boolean,
}

class WorkspacePage {
    async setSettings(settings: Partial<OpenTabSettingsPluginSettings>) {
        await browser.executeObsidian(async ({plugins}, settings) => {
            await plugins.openTabSettings.updateSettings(settings);
        }, settings);
    }

    async loadPlatformWorkspaceLayout(layout: string) {
        const platform = await obsidianPage.getPlatform();
        if (platform.isPhone) {
            layout = layout + "-phone";
        } else if (platform.isTablet) {
            layout = layout + "-tablet";
        }
        await obsidianPage.loadWorkspaceLayout(layout);
    }

    /**
     * Opens a file in a new tab.
     * 
     * Normally I'd just use `wdio-obsidian-service` `obsidianPage.openFile`, but that method uses `getLeaf`, which we
     * are patching. So this plugin uses its own openFile that bypasses our patch so openFile behavior isn't affected
     * by the settings.
     */
    async openFile(path: string) {
        await browser.executeObsidian(async ({app, obsidian}, path) => {
            const file = app.vault.getAbstractFileByPath(path);
            if (file instanceof obsidian.TFile) {
                const leaf = app.workspace.createLeafInTabGroup();
                await leaf.openFile(file);
                app.workspace.setActiveLeaf(leaf, {focus: true});
            } else {
                throw Error(`No file ${path} exists`);
            }
        }, path)
    }

    /**
     * Get all leaves in the rootSplit or floating windows, excluding sidebars.
     * Results are grouped by tab pane.
     */
    async getAllLeaves(): Promise<LeafInfo[][]> {
        return await browser.executeObsidian(({app, obsidian}) => {
            const tabGroups: WorkspaceParent[] = [];
            
            // I'm assuming iterateAllLeaves goes in the natural order, which it seems to
            app.workspace.iterateAllLeaves(leaf => {
                const root = leaf.getRoot();
                // Don't include sidebars and such, but do include popout windows
                if (root instanceof obsidian.WorkspaceRoot || root instanceof obsidian.WorkspaceFloating) {
                    if (!tabGroups.includes(leaf.parent)) {
                        tabGroups.push(leaf.parent);
                    }
                }
            });

            const activeLeaf = app.workspace.getActiveViewOfType(obsidian.View)!.leaf;

            return [...tabGroups].map(leaf =>
                (leaf.children as WorkspaceLeaf[]).map(leaf => {
                    return {
                        parent: leaf.parent.id,
                        id: leaf.id,
                        root: leaf.getRoot().id, container: leaf.getContainer().id,
                        type: leaf.view.getViewType(),
                        file: (leaf.getViewState()?.state?.file ?? "") as string,
                        deferred: leaf.isDeferred, pinned: leaf.pinned,
                        active: activeLeaf == leaf,
                    };
                })
            );
        });
    }

    /**
     * Returns leaf for a path. Can also be passed the id directly in which case it returns the id if it exists.
     * @param pathOrId 
     */

    async getLeaf(pathOrId: string): Promise<LeafInfo> {
        const allLeaves = (await this.getAllLeaves()).flatMap(l => l);
        const matches = allLeaves.filter(l => l.id == pathOrId ||l.file == pathOrId);
        if (matches.length < 1) {
            throw new Error(`No leaf for ${pathOrId} found`)
        } else if (matches.length > 1) {
            throw new Error(`Multiple leaves for ${pathOrId} found`)
        }
        return matches[0];
    }

    async getActiveLeaf(): Promise<LeafInfo> {
        const allLeaves = (await this.getAllLeaves()).flatMap(l => l);
        return allLeaves.find(l => l.active)!;
    }

    /** Seems like there should be a built-in WebdriverIO way to do this... */
    async waitUntilEqual(func: () => any, expected: any) {
        let result: any
        try {
            await browser.waitUntil(async () => {
                result = await func();
                return equals(result, expected);
            });
        } catch {}
        // Call expect again, this will give us nice error messages if value doesn't match.
        expect(result).toEqual(expected);
    }

    /** Match against leaves */
    async matchWorkspace(expected: Partial<LeafInfo>[][]) {
        const matcher = expected.map(g => g.map(l => expect.objectContaining(l)));
        let actual: LeafInfo[][] = [];
        try {
            await browser.waitUntil(async () => {
                actual = await this.getAllLeaves();
                return equals(actual, matcher);
            });
        } catch {}
        // Call expect again, this will give us nice error messages if value doesn't match.
        expect(actual).toEqual(matcher);
    }

    /**
     * Focuses tab containing file.
     */
    async setActiveFile(pathOrId: string) {
        const leafInfo = await this.getLeaf(pathOrId);
        await browser.executeObsidian(({app}, leafInfo) => {
            const leaf = app.workspace.getLeafById(leafInfo.id)!
            app.workspace.setActiveLeaf(leaf, {focus: true});
        }, leafInfo);
        await browser.waitUntil(async () => (await this.getActiveLeaf()).id == leafInfo.id);
    }

    /**
     * Pins the specified tab. Note it also focuses the tab.
     */
    async pinTab(pathOrId: string) {
        await this.setActiveFile(pathOrId);
        await browser.executeObsidianCommand("workspace:toggle-pin");
    }

    async getLink(text: string): Promise<ChainablePromiseElement> {
        const activeView = $(await browser.executeObsidian(({app, obsidian}) =>
            app.workspace.getActiveViewOfType(obsidian.View)!.containerEl
        ));
        // In reading view there's some kind of hidden copy of the link that shows up as well, so we have to filter for
        // the "internal-link" real one.
        return activeView.$(`.//a[contains(@class, 'internal-link') and text() = '${text}']`)
    }

    async openLink(link: ChainablePromiseElement) {
        await link.click();
    }

    async openContextMenu(elem: ChainablePromiseElement) {
        await this.setConfig('nativeMenus', false);
        const platform = await obsidianPage.getPlatform();
        if (platform.isDesktopApp) {
            await elem.click({button: "right"});
        } else {
            // on android, the context menu event is a glitchy and I can't get the longPress to work properly from wdio.
            // Instead manually trigger it in js:
            await browser.execute((elem) => {
                let {bottom, left, right, top} = elem.getBoundingClientRect()
                const x = (right - left)/2 + left; // get middle
                const y = (bottom - top)/2 + top;
                elem.dispatchEvent(new MouseEvent("contextmenu", {
                    button: 0, buttons: 0,
                    screenX: x, screenY: y,
                    bubbles: true, cancelable: true,
                    clientX: x, clientY: y,
                }))
            }, elem);
        }
        // Clicking in the mobile drawer context menu thing somehow triggers Rename instead of open in new tab
        // if I don't wait a bit
        if (platform.isMobile) {
            await browser.pause(250);
        }
        return browser.$(".menu");
    }

    async openLinkInNewTab(link: ChainablePromiseElement) {
        const menu = await this.openContextMenu(link);
        await menu.$("div.*=Open in new tab").click()
    }

    async openLinkToRight(link: ChainablePromiseElement) {
        const menu = await this.openContextMenu(link);
        await menu.$("div.*=Open to the right").click()
    }

    async openLinkInNewWindow(link: ChainablePromiseElement) {
        const menu = await this.openContextMenu(link);
        await menu.$("div.*=Open in new window").click()
    }

    async openLinkInSameTab(link: ChainablePromiseElement) {
        const menu = await this.openContextMenu(link);
        await menu.$("div.*=Open in same tab").click()
    }

    async openFileViaQuickSwitcher(path: string): Promise<void> {
        path = path.replace(/\.md$/, '')
        await browser.executeObsidianCommand("switcher:open");
        await browser.keys(path);
        await browser.keys(Key.Enter);
    }

    async openFileViaFileExplorer(path: string): Promise<void> {
        const expandAllButton = $(".nav-action-button[aria-label='Expand all']");
        if (await expandAllButton.isExisting()) {
            await expandAllButton.click()
        }
        const platform = await obsidianPage.getPlatform();
        if (platform.isTablet) {
            await browser.$(".sidebar-toggle-button").click();
        } else if (platform.isMobile) {
            await browser.$(".mod-left-split-toggle").click();
            await browser.pause(250);
        }
        await $(`.nav-files-container [data-path='${path}']`).click()
    }

    async setConfig(name: ConfigItem, value: any) {
        await browser.executeObsidian(({app}, name, value) => {
            app.vault.setConfig(name, value);
        }, name, value)
    }

    async removeFile(file: string) {
        await browser.executeObsidian(async ({app}, file) => {
            await app.vault.delete(app.vault.getAbstractFileByPath(file)!);
        }, file);
    }
}

const workspacePage = new WorkspacePage()
export default workspacePage;
