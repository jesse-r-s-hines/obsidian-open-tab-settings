import { browser } from '@wdio/globals'
import { expect } from 'chai';
import type { ChainablePromiseElement } from 'webdriverio'
import { MyPluginSettings } from "src/main.js"


async function setSettings(settings: Partial<MyPluginSettings>) {
    await browser.execute((settings) => {
        const plugin = (optl.app as any).plugins.plugins['sample-plugin']
        Object.assign(plugin.settings, settings);
        plugin.saveSettings();
    }, settings)
}

/** Opens file in new tab. */
async function openFile(path: string) {
    await browser.execute((path) => {
        const file = optl.app.vault.getFileByPath(path);
        if (!file) {
            throw Error(`No file ${path} exists`);
        }
        optl.app.workspace.getLeaf('tab').openFile(file);
    }, path)
}

async function getActiveLeaf() {
    const el = await browser.execute(() => {
        return optl.app.workspace.getActiveViewOfType(optl.obsidian.MarkdownView)!.containerEl;
    })
    return $(el);
}

async function getAllLeaves(): Promise<[[string, string][], [string, string]]> {
    return await browser.execute(() => {
        const leaves: [string, string][] = []
        let activeLeaf: [string, string]
        optl.app.workspace.iterateRootLeaves(l => {
            let file = ""
            if (l.view instanceof optl.obsidian.MarkdownView) {
                file = l.view.file?.path ?? "";
            }
            const viewInfo = [l.view.getViewType(), file] as [string, string]
            leaves.push(viewInfo)
            if ((l as any).containerEl.hasClass('mod-active')) {
                activeLeaf = viewInfo
            }
        })
        leaves.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
        return [leaves, activeLeaf!]
    })
}

export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Test my plugin', () => {
    it('basic test', async () => {
        await setSettings({ openInNewTab: true });
        await openFile("A.md");
        const leaf = await getActiveLeaf()
        const link = await leaf.$$("a").find<ChainablePromiseElement>(async (l) => await l.getText() == "B")
        await link.click()
        await browser.waitUntil(() => browser.execute(() => {
            let result = false;
            optl.app.workspace.iterateRootLeaves(l => {
                if (l.view instanceof optl.obsidian.MarkdownView && l.view.file?.path == "B.md") {
                    result = true
                }
            })
            return result;
        }))
        const [open, active] = await getAllLeaves()
        expect(open).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        expect(active).to.eql(["markdown", "B.md"])
    })
})
