import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test basic open in new tab', function() {
    beforeEach(async function() {
        await obsidianPage.resetVault();
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: false });
        await workspacePage.setConfig('focusNewTab', false);
    });

    it('opens in new tab and focuses when focusNewTab is false', async function() {
        await workspacePage.setConfig('focusNewTab', false);
        await obsidianPage.openFile("A.md");
        await (await workspacePage.getLink("B")).click()

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it('opens in new tab and focuses when focusNewTab is true', async function() {
        await workspacePage.setConfig('focusNewTab', true);
        // The new tab should focus regardless of focusNewTab setting.
        await obsidianPage.openFile("A.md");
        await (await workspacePage.getLink("B")).click()

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it('opens in new tab from file explorer', async function() {
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaFileExplorer("B.md");

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
        ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it('opens in new tab from file modal', async function() {
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaFileExplorer("B.md");

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it('opens in new tab from sidebar outgoing links', async function() {
        await obsidianPage.openFile("A.md");
        const button = await browser
            .$$(".workspace-tab-header")
            .find(e => e.$("div.*=Outgoing links").isExisting()) as ChainablePromiseElement
        await button.click()
        const item = browser.$(".workspace-leaf-content[data-type='outgoing-link']").$("div=B");
        await item.click()
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it('opens images in new tab', async function() {
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaModal("image.png")
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["image", "image.png"], ["markdown", "A.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["image", "image.png"]);
    })

    it('opens pdfs in new tab', async function() {
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaModal("pdf.pdf")
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["pdf", "pdf.pdf"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["pdf", "pdf.pdf"]);
    })

    it('opens file from pdfs opens in new tab', async function() {
        await obsidianPage.openFile("pdf.pdf");
        await workspacePage.openFileViaModal("A.md");
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["pdf", "pdf.pdf"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
    })

    it('graph view opens in new tab', async function() {
        await obsidianPage.openFile("A.md");
        await browser.executeObsidianCommand("graph:open");
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["graph", ""], ["markdown", "A.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["graph", ""]);
    })

    it('open file while on graph view opens in new tab', async function() {
        await browser.executeObsidianCommand("graph:open");
        await workspacePage.openFileViaModal("A.md")
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["graph", ""], ["markdown", "A.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
    })

    it('open daily note opens in new tab', async function() {
        await obsidianPage.openFile("A.md")
        await browser.executeObsidianCommand("daily-notes");
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        const leaves = await workspacePage.getAllLeaves();
        expect(leaves[1]).toEqual(['markdown', "A.md"])
        const activeLeaf = await workspacePage.getActiveLeaf();
        expect(activeLeaf[1]).toMatch(/\d\d\d\d-\d\d-\d\d/);
    })

    it('opens in new tab from bookmarks', async function() {
        await obsidianPage.openFile("A.md");
        const button = await browser
            .$$(".workspace-tab-header")
            .find(e => e.$("div.*=Bookmarks").isExisting()) as ChainablePromiseElement
        await button.click()
        const item = browser.$(".workspace-leaf-content[data-type='bookmarks'] [data-path=B]");
        await item.click()
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it('open self link', async function() {
        await obsidianPage.openFile("Loop.md");
        const prevActiveLeaf = await workspacePage.getActiveLeafId();
        await (await workspacePage.getLink("Loop.md")).click();
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "Loop.md"], ["markdown", "Loop.md"],
        ])
        expect(await workspacePage.getActiveLeafId()).not.toEqual(prevActiveLeaf);
    })

    it('re-open file', async function() {
        await obsidianPage.openFile("Loop.md");
        const prevActiveLeaf = await workspacePage.getActiveLeafId();
        await workspacePage.openFileViaModal("Loop.md");
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "Loop.md"], ["markdown", "Loop.md"],
        ]);
        expect(await workspacePage.getActiveLeafId()).not.toEqual(prevActiveLeaf);
    })

    it("open new file", async function() {
        await obsidianPage.openFile("A.md");
        await browser.executeObsidianCommand("file-explorer:new-file");
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "Untitled.md"]]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "Untitled.md"]);
    })
    
    it("open new file in current tab", async function() {
        await obsidianPage.openFile("A.md");
        await browser.executeObsidianCommand("file-explorer:new-file-in-current-tab");
        // TODO: Should probably fix this behavior
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "Untitled.md"]])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "Untitled.md"]);
    })

    it('open new file via link', async function() {
        await obsidianPage.openFile("B.md");
        await (await workspacePage.getLink("C")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "B.md"], ["markdown", "C.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "C.md"]);
    })

    it('open canvas opens in new tab', async function() {
        await obsidianPage.openFile("A.md");
        await (await workspacePage.getLink("Canvas.canvas")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["canvas", "Canvas.canvas"], ["markdown", "A.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["canvas", "Canvas.canvas"]);
    })

    it('open link in canvas', async function() {
        await obsidianPage.openFile("Canvas.canvas");
        // Focus a node
        const node = browser.$(".canvas-node-label=A").$("..");
        await node.click();
        // click a link in the node
        await node.$("a=B").click()

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["canvas", "Canvas.canvas"], ["markdown", "B.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })
})
