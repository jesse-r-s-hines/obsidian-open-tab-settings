import type { ElementBase } from 'webdriverio'
import type { WorkspaceLeaf } from "obsidian";

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

    async getLink(text: string): Promise<ChainablePromiseElement> {
        const link = await browser.execute((text) => {
            const el = optl.app.workspace.getActiveViewOfType(optl.obsidian.MarkdownView)!.containerEl;
            return [...el.querySelectorAll("a")].find(a => a.getText() == text)
        }, text)
        if (!link) {
            throw Error(`No link "${text}" found`)
        }
        return $(link)
    }
}

const workspacePage = new WorkspacePage()
export default workspacePage;
