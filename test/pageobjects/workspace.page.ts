import { Key, ChainablePromiseElement } from 'webdriverio'
import * as path from "path"
import * as fs from "fs"
import { ConfigItem } from 'obsidian-typings'

class WorkspacePage {
    /** Get ids of all leaves in the rootSplit or floating windows, excluding sidebars. */
    async getAllLeafIds(): Promise<string[]> {
        return await browser.executeObsidian(({app, obsidian}) => {
            const leaves: string[] = []
            app.workspace.iterateAllLeaves(l => {
                const root = l.getRoot()
                // Don't include sidebars and such, but do include popout windows
                if (root instanceof obsidian.WorkspaceRoot || root instanceof obsidian.WorkspaceFloating) {
                    leaves.push(l.id)
                }
            })
            return leaves.sort();
        })
    }

    /**
     * Returns leaf id for a path. Can also be passed the id directly in which case it returns the id if it exists.
     * @param pathOrId 
     */

    async getLeaf(pathOrId: string): Promise<string> {
        const allLeaves = await this.getAllLeafIds()
        const matches =  await browser.executeObsidian(async ({app, obsidian}, allLeaves, pathOrId) => {
            const matches = allLeaves
                .map(id => app.workspace.getLeafById(id)!)
                .filter(l => (
                    l.id == pathOrId ||
                    (l.view instanceof obsidian.FileView && l.view.file?.path == pathOrId)
                ))
                .map(l => l.id);
            return matches;
        }, allLeaves, pathOrId);
        if (matches.length < 1) {
            throw new Error(`No leaf for ${pathOrId} found`)
        } else if (matches.length > 1) {
            throw new Error(`Multiple leaves for ${pathOrId} found`)
        }
        return matches[0];
    }

    async getActiveLeaf(): Promise<[string, string]> {
        return await browser.executeObsidian(({app, obsidian}) => {
            const leaf = app.workspace.getActiveViewOfType(obsidian.View)!.leaf;
            let file = ""
            if (leaf.view instanceof obsidian.FileView) {
                file = leaf.view.file?.path ?? ''
            }
            return [leaf.view.getViewType(), file]
        })
    }

    /**
     * Focuses tab containing file.
     */
    async setActiveFile(pathOrId: string) {
        const leafId = await this.getLeaf(pathOrId);
        await browser.executeObsidian(({app, obsidian}, leafId) => {
            const leaf = app.workspace.getLeafById(leafId)!
            app.workspace.setActiveLeaf(leaf, {focus: true});
        }, leafId)
    }

    async getActiveLeafId(): Promise<string> {
        return await browser.executeObsidian(({app, obsidian}) => {
            const leaf = app.workspace.getActiveViewOfType(obsidian.View)!.leaf;
            return leaf.id
        })
    }

    /** Get id of leaf's parent by path or */
    async getLeafParent(pathOrId: string): Promise<string> {
        const leafId = await this.getLeaf(pathOrId);
        return await browser.executeObsidian(({app}, leafId) => {
            return app.workspace.getLeafById(leafId)!.parent.id
        }, leafId)
    }

    /** Get id of leaf's root by path  */
    async getLeafRoot(pathOrId: string): Promise<string> {
        const leafId = await this.getLeaf(pathOrId);
        return await browser.executeObsidian(({app}, leafId) => {
            return app.workspace.getLeafById(leafId)!.getRoot().id
        }, leafId)
    }

    async getLeafContainer(pathOrId: string): Promise<string> {
        const leafId = await this.getLeaf(pathOrId);
        return await browser.executeObsidian(({app}, leafId) => {
            return app.workspace.getLeafById(leafId)!.getContainer().id
        }, leafId)
    }

    async getAllLeaves(): Promise<[string, string][]> {
        const leafIds = await this.getAllLeafIds()
        return await browser.executeObsidian(({app, obsidian}, leafIds) => {
            const leaves = leafIds.map(id => {
                const leaf = app.workspace.getLeafById(id)!;
                let file = ""
                if (leaf.view instanceof obsidian.FileView) {
                    file = leaf.view.file?.path ?? "";
                }
                return [leaf.view.getViewType(), file] as [string, string]
            })
            return leaves.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
        }, leafIds)
    }

    async getLeavesWithDeferred(): Promise<[string, string, boolean][]> {
        const leafIds = await workspacePage.getAllLeafIds();
        return await browser.executeObsidian(({ app }, leafIds) => {
            return leafIds
                .map(l => app.workspace.getLeafById(l)!)
                .map(l => [l.view.getViewType(), l.getViewState()?.state?.file ?? "", l.isDeferred] as [string, string, boolean])
                .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
        }, leafIds)
    }

    async getLink(text: string) {
        const activeView = $(await browser.executeObsidian(({app, obsidian}) =>
            app.workspace.getActiveViewOfType(obsidian.View)!.containerEl
        ))
        return activeView.$(`a=${text}`)
    }

    async openLinkToRight(link: ChainablePromiseElement) {
        await workspacePage.setConfig('nativeMenus', false);
        await link.click({button: "right"});
        await browser.$(".menu").$("div.*=Open to the right").click()
    }

    async openLinkInNewWindow(link: ChainablePromiseElement) {
        await workspacePage.setConfig('nativeMenus', false);
        await link.click({button: "right"});
        await browser.$(".menu").$("div.*=Open in new window").click()
    }

    async openLinkInSameTab(link: ChainablePromiseElement) {
        await workspacePage.setConfig('nativeMenus', false);
        await link.click({button: "right"});
        await browser.$(".menu").$("div.*=Open in same tab").click()
    }

    async openFileViaModal(path: string): Promise<void> {
        path = path.replace(/\.md$/, '')
        await browser.keys([Key.Ctrl, 'o']);
        await browser.keys(path);
        await browser.keys(Key.Enter);
    }

    async openFileViaFileExplorer(path: string): Promise<void> {
        const expandAllButton = $(".nav-action-button[aria-label='Expand all']");
        if (await expandAllButton.isExisting()) {
            await expandAllButton.click()
        }
        await $(`.nav-files-container [data-path='${path}']`).click()
    }

    async setConfig(name: ConfigItem, value: any) {
        await browser.executeObsidian(({app}, name, value) => {
            app.vault.setConfig(name, value);
        }, name, value)
    }

    async removeFile(file: string) {
        await browser.executeObsidian(async ({app, obsidian}, file) => {
            await app.vault.delete(app.vault.getAbstractFileByPath(file)!);
        }, file!);
    }
}

const workspacePage = new WorkspacePage()
export default workspacePage;
