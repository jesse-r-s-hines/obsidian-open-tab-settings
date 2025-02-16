import { Key, ChainablePromiseElement } from 'webdriverio'
import type { WorkspaceLeaf } from "obsidian";

import * as fsAsync from "fs/promises";
import * as path from "path";

class WorkspacePage {
    /**
     * Opens a markdown file in a new tab.
     */
    async openFile(path: string) {
        await browser.execute(async (path) => {
            const file = optl.app.vault.getFileByPath(path);
            if (!file) {
                throw Error(`No file ${path} exists`);
            }
            await optl.app.workspace.getLeaf('tab').openFile(file);
        }, path)
    }

    /**
     * Focuses tab containing file.
     */
    async setActiveFile(path: string) {
        await browser.execute(() => {
            let leaf: WorkspaceLeaf|undefined
            optl.app.workspace.iterateRootLeaves(l => {
                if (l.view instanceof optl.obsidian.MarkdownView && l.view.file?.path == path && !leaf) {
                    leaf = l
                }
                if (!leaf) {
                    throw new Error(`No leaf for ${path} found`)
                }
                optl.app.workspace.setActiveLeaf(leaf, {focus: true});
            })
        })
    }

    async getActiveLeaf(): Promise<[string, string]> {
        return await browser.execute(() => {
            let activeLeaf: [string, string]
            optl.app.workspace.iterateRootLeaves(l => {
                let file = ""
                if (l.view instanceof optl.obsidian.MarkdownView) {
                    file = l.view.file?.path ?? "";
                }
                if ((l as any).containerEl.hasClass('mod-active')) {
                    activeLeaf = [l.view.getViewType(), file]
                }
            })
            return activeLeaf!
        })
    }

    async getAllLeaves(): Promise<[string, string][]> {
        return await browser.execute(() => {
            const leaves: [string, string][] = []
            optl.app.workspace.iterateRootLeaves(l => {
                let file = ""
                if (l.view instanceof optl.obsidian.MarkdownView) {
                    file = l.view.file?.path ?? "";
                }
                const viewInfo = [l.view.getViewType(), file] as [string, string]
                leaves.push(viewInfo)
            })
            leaves.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
            return leaves
        })
    }

    async getLink(text: string) {
        const link = await browser.execute((text) => {
            const el = optl.app.workspace.getActiveViewOfType(optl.obsidian.MarkdownView)!.containerEl;
            return [...el.querySelectorAll("a")].find(a => a.getText() == text)
        }, text)
        if (!link) {
            throw Error(`No link "${text}" found`)
        }
        return $(link)
    }

    async openLinkToRight(link: ChainablePromiseElement) {
        await link.click({button: "right"});
        await browser.$("//*[contains(@class, 'menu')]//*[text()='Open to the right']").click()
    }

    async openLinkInNewWindow(link: ChainablePromiseElement) {
        await link.click({button: "right"});
        await browser.$("//*[contains(@class, 'menu')]//*[text()='Open in new window']").click()
    }

    async loadWorkspaceLayout(layout: string): Promise<void> {
        // Click on the status-bar to focus the main window in case there are multiple Obsidian windows panes
        await $(".status-bar").click()
        await browser.executeObsidianCommand("workspaces:load");
        await $(`//*[contains(@class, 'suggestion-item') and text()="${layout}"]`).click();
        const workspacesFile = path.join((await browser.getVaultPath())!, '.obsidian/workspaces.json');
        await browser.waitUntil(async () =>
            JSON.parse(await fsAsync.readFile(workspacesFile, 'utf-8')).active == layout,
        );
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
        await browser.execute((name, value) => {
            (optl.app.vault as any).setConfig(name, value);
        }, name, value)
    }
}

const workspacePage = new WorkspacePage()
export default workspacePage;
