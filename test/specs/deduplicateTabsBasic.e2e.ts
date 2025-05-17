import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';
import { sleep } from './helpers';


describe('Test basic deduplicate', () => {
    beforeEach(async () => {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: false, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', false);
    });

    it('basic deduplicate', async () => {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"])
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
    })

    it('basic deduplicate 3 files', async () => {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await obsidianPage.openFile("D.md");

        await workspacePage.setActiveFile("B.md");
        (await workspacePage.getLink("A")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "D.md"],
        ]);
    })

    it('re-open file', async () => {
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaModal("A.md");
        await sleep(250);
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "A.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"]]);
    })

    it('re-open self link', async () => {
        await obsidianPage.openFile("Loop.md");
        (await workspacePage.getLink("Loop.md")).click();
        await sleep(250);
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "Loop.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "Loop.md"]]);
    })

    it("open self link in new tab focusNewTab true", async () => {
        await workspacePage.setConfig('focusNewTab', true);

        await obsidianPage.openFile("Loop.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop.md"));
        await sleep(250);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "Loop.md"]])
    })

    it("open self link in new tab focusNewTab false", async () => {
        await workspacePage.setConfig('focusNewTab', false);

        await obsidianPage.openFile("Loop.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop.md"));
        await sleep(250);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "Loop.md"]])
    })

    it('deduplicate via file explorer', async () => {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openFileViaFileExplorer("B.md")

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it('deduplicate via sidebar', async () => {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        const button = await browser
            .$$(".workspace-tab-header")
            .find(e => e.$("div.*=Outgoing links").isExisting()) as ChainablePromiseElement;
        await button.click()
        const item = await browser.$(".workspace-leaf-content[data-type='outgoing-link']").$("div=B");
        await item.click()

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"])
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ])
    })

    it('deduplicate via file modal', async () => {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setActiveFile("B.md");
        await workspacePage.openFileViaModal("A.md")

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
    })

    it('deduplicate with multiple matches', async () => {
        await workspacePage.setSettings({ deduplicateTabs: false });
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setSettings({ deduplicateTabs: true });

        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"])
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"],
        ]);
    })

    it('deduplicate with multiple matches on current file', async () => {
        await workspacePage.setSettings({ deduplicateTabs: false });
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("Loop.md");
        await obsidianPage.openFile("Loop.md");
        await workspacePage.setSettings({ deduplicateTabs: true });

        const [loop1, loop2] = await browser.executeObsidian(async ({app}) => {
            const loop1: string = (app.workspace.rootSplit as any).children[0].children[1].id
            const loop2: string = (app.workspace.rootSplit as any).children[0].children[2].id
            return [loop1, loop2]
        });
        // set the second Loop.md as active
        await browser.executeObsidian(async ({app}, leafId) => {
            await app.workspace.setActiveLeaf(app.workspace.getLeafById(leafId)!, {focus: true})
        }, loop2);

        (await workspacePage.getLink("Loop")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "Loop.md"]);
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "Loop.md"], ["markdown", "Loop.md"],
        ]);
    })

    it('dedup images', async () => {
        await obsidianPage.openFile("image.png");
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaModal("image.png")
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["image", "image.png"])
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["image", "image.png"], ["markdown", "A.md"],
        ]);
    })

    it('dedup png', async () => {
        await obsidianPage.openFile("pdf.pdf");
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaModal("pdf.pdf")
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["pdf", "pdf.pdf"]);
        await workspacePage.waitUntilEqual(() =>  workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["pdf", "pdf.pdf"],
        ]);
    })

    it('empty tab', async () => {
        await obsidianPage.openFile("A.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.openFileViaModal("A.md")
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"])
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [["markdown", "A.md"]])
    })

    it('explicit new tab', async () => {
        await workspacePage.setConfig('focusNewTab', true);
        await obsidianPage.openFile("B.md");
        await obsidianPage.openFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));
        // Should still deduplicate if opened in new tab explicitly
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"])
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
    })
})
