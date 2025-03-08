import { browser } from '@wdio/globals'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';
import { setSettings } from './helpers';


describe('Test basic open in new tab', () => {
    beforeEach(async () => {
        await obsidianPage.loadWorkspaceLayout("empty");
        await setSettings({ openInNewTab: true, deduplicateTabs: false });
        await workspacePage.setConfig('focusNewTab', false);
    });

    it('opens in new tab and focuses when focusNewTab is false', async () => {
        await workspacePage.setConfig('focusNewTab', false);
        await obsidianPage.openFile("A.md");
        (await workspacePage.getLink("B")).click()

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
    })

    it('opens in new tab and focuses when focusNewTab is true', async () => {
        await workspacePage.setConfig('focusNewTab', true);
        // The new tab should focus regardless of focusNewTab setting.
        await obsidianPage.openFile("A.md");
        (await workspacePage.getLink("B")).click()

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
    })

    it('opens in new tab from file explorer', async () => {
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaFileExplorer("B.md");

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
    })

    it('opens in new tab from file modal', async () => {
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaFileExplorer("B.md");

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
    })

    it('opens in new tab from sidebar outgoing links', async () => {
        await obsidianPage.openFile("A.md");
        const button = await browser.$$(".workspace-tab-header").find(e => e.$("div.*=Outgoing links").isExisting()) as any
        await button.click()
        const item = await browser.$(".workspace-leaf-content[data-type='outgoing-link']").$("div=B");
        await item.click()
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
    })

    it('opens images in new tab', async () => {
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaModal("image.png")
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["image", "image.png"], ["markdown", "A.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["image", "image.png"])
    })

    it('opens pdfs in new tab', async () => {
        await obsidianPage.openFile("A.md");
        await workspacePage.openFileViaModal("pdf.pdf")
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["pdf", "pdf.pdf"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["pdf", "pdf.pdf"])
    })

    it('opens file from pdfs opens in new tab', async () => {
        await obsidianPage.openFile("pdf.pdf");
        await workspacePage.openFileViaModal("A.md");
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["pdf", "pdf.pdf"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "A.md"])
    })

    it('graph view opens in new tab', async () => {
        await obsidianPage.openFile("A.md");
        await browser.executeObsidianCommand("graph:open");
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["graph", ""], ["markdown", "A.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["graph", ""])
    })

    it('open file while on graph view opens in new tab', async () => {
        await browser.executeObsidianCommand("graph:open");
        await workspacePage.openFileViaModal("A.md")
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["graph", ""], ["markdown", "A.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "A.md"])
    })

    it('open daily note opens in new tab', async () => {
        await obsidianPage.openFile("A.md")
        await browser.executeObsidianCommand("daily-notes");
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        const leaves = await workspacePage.getAllLeaves();
        expect(leaves[1]).to.eql(['markdown', "A.md"])
        const activeLeaf = await workspacePage.getActiveLeaf();
        expect(activeLeaf[1]).to.match(/\d\d\d\d-\d\d-\d\d/)
        workspacePage.removeFile(activeLeaf[1]);
    })

    it('opens in new tab from bookmarks', async () => {
        await obsidianPage.openFile("A.md");
        const button = await browser.$$(".workspace-tab-header").find(e => e.$("div.*=Bookmarks").isExisting()) as any
        await button.click()
        const item = await browser.$(".workspace-leaf-content[data-type='bookmarks'] [data-path=B]");
        await item.click()
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
    })

    it('open self link', async () => {
        await obsidianPage.openFile("Loop.md");
        const prevActiveLeaf = await workspacePage.getActiveLeafId();
        (await workspacePage.getLink("Loop.md")).click();
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "Loop.md"], ["markdown", "Loop.md"]])
        expect(await workspacePage.getActiveLeafId()).to.not.eql(prevActiveLeaf);
    })

    it('re-open file', async () => {
        await obsidianPage.openFile("Loop.md");
        const prevActiveLeaf = await workspacePage.getActiveLeafId();
        await workspacePage.openFileViaModal("Loop.md");
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "Loop.md"], ["markdown", "Loop.md"]])
        expect(await workspacePage.getActiveLeafId()).to.not.eql(prevActiveLeaf);
    })

    it("open new file", async () => {
        await obsidianPage.openFile("A.md");
        await browser.executeObsidianCommand("file-explorer:new-file");
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "Untitled.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "Untitled.md"])
        await workspacePage.removeFile("Untitled.md");
    })
    
    it("open new file in current tab", async () => {
        await obsidianPage.openFile("A.md");
        await browser.executeObsidianCommand("file-explorer:new-file-in-current-tab");
        // TODO: Should probably fix this behavior
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "Untitled.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "Untitled.md"])
        await workspacePage.removeFile("Untitled.md");
    })

    it('open new file via link', async () => {
        await obsidianPage.openFile("B.md");
        (await workspacePage.getLink("C")).click()

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "B.md"], ["markdown", "C.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "C.md"])
    })

    it('open canvas opens in new tab', async () => {
        await obsidianPage.openFile("A.md");
        (await workspacePage.getLink("Canvas.canvas")).click()

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["canvas", "Canvas.canvas"], ["markdown", "A.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["canvas", "Canvas.canvas"])
    })

    it('open link in canvas', async () => {
        await obsidianPage.openFile("Canvas.canvas");
        // Focus a node
        const node = browser.$(".canvas-node-label=A").$("..")
        await node.click();
        // click a link in the node
        await node.$("a=B").click()

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["canvas", "Canvas.canvas"], ["markdown", "B.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
    })
})
