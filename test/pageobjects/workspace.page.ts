import { Key, ChainablePromiseElement } from 'webdriverio'
import type { WorkspaceLeaf } from "obsidian";

class WorkspacePage {
    /**
     * Opens a markdown file in a new tab.
     */
    async openFile(path: string) {
        await browser.executeObsidian(async ({app}, path) => {
            const file = app.vault.getFileByPath(path);
            if (!file) {
                throw Error(`No file ${path} exists`);
            }
            await app.workspace.getLeaf('tab').openFile(file);
        }, path)
    }

    /** Get ids of all leaves in the rootSplit or floating windows, excluding sidebars. */
    async getAllLeafIds(): Promise<string[]> {
        return await browser.executeObsidian(({app, obsidian}) => {
            const leaves: string[] = []
            app.workspace.iterateAllLeaves(l => {
                const root = l.getRoot()
                // Don't include sidebars and such, but do include popout windows
                if (root instanceof obsidian.WorkspaceRoot || root instanceof obsidian.WorkspaceFloating) {
                    leaves.push((l as any).id)
                }
            })
            return leaves.sort();
        })
    }

    async getLeafIdByPath(path: string): Promise<string> {
        const leafIds = await this.getAllLeafIds()
        const leafId =  await browser.executeObsidian(async ({app, obsidian}, leafIds, path) => {
            const leaf = leafIds
                .map(id => app.workspace.getLeafById(id)!)
                .find(l => l.view instanceof obsidian.FileView && l.view.file?.path == path);
            return (leaf as any)?.id;
        }, leafIds, path);
        if (!leafId) {
            throw new Error(`No leaf for ${path} found`)
        }
        return leafId;
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
    async setActiveFile(path: string) {
        const leafId = await this.getLeafIdByPath(path);
        await browser.executeObsidian(({app, obsidian}, leafId) => {
            const leaf = app.workspace.getLeafById(leafId)!
            app.workspace.setActiveLeaf(leaf, {focus: true});
        }, leafId)
    }

    async getActiveLeafId(): Promise<string> {
        return await browser.executeObsidian(({app, obsidian}) => {
            const leaf = app.workspace.getActiveViewOfType(obsidian.View)!.leaf;
            return (leaf as any).id
        })
    }

    /** Get id of leaf's parent by path  */
    async getLeafParent(path: string): Promise<string> {
        const leafId = await this.getLeafIdByPath(path);
        return await browser.executeObsidian(({app}, leafId) => {
            return (app.workspace.getLeafById(leafId)?.parent as any).id
        }, leafId)
    }

    /** Get id of leaf's root by path  */
    async getLeafRoot(path: string): Promise<string> {
        const leafId = await this.getLeafIdByPath(path);
        return await browser.executeObsidian(({app}, leafId) => {
            return (app.workspace.getLeafById(leafId)?.getRoot() as any).id
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

    async getLink(text: string) {
        const activeView = $(await browser.executeObsidian(({app, obsidian}) =>
            app.workspace.getActiveViewOfType(obsidian.View)!.containerEl
        ))
        return activeView.$(`a=${text}`)
    }

    async openLinkToRight(link: ChainablePromiseElement) {
        await link.click({button: "right"});
        await browser.$(".menu").$("div.*=Open to the right").click()
    }

    async openLinkInNewWindow(link: ChainablePromiseElement) {
        await link.click({button: "right"});
        await browser.$(".menu").$("div.*=Open in new window").click()
    }

    async loadWorkspaceLayout(layout: string): Promise<void> {
        // Click on the status-bar to focus the main window in case there are multiple Obsidian windows panes
        await $(".status-bar").click();
        await browser.executeObsidian(async ({app}, layout) => {
            await (app as any).internalPlugins.plugins['workspaces'].instance.loadWorkspace(layout);
        }, layout);
        // Alternative method going through the GUI
        // await browser.executeObsidianCommand("workspaces:load");
        // await browser.$(".prompt").$(`div=${layout}`).click()
        // const workspacesFile = path.join((await browser.getVaultPath())!, '.obsidian/workspaces.json');
        // await browser.waitUntil(async () =>
        //     JSON.parse(await fsAsync.readFile(workspacesFile, 'utf-8')).active == layout,
        // );
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

    async setConfig(name: string, value: any) {
        await browser.executeObsidian(({app}, name, value) => {
            (app.vault as any).setConfig(name, value);
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
