import { browser } from '@wdio/globals'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { setSettings, sleep } from './helpers';


describe('Test basic deduplicate', () => {
    beforeEach(async () => {
        await workspacePage.loadWorkspaceLayout("empty");
        await setSettings({ openInNewTab: false, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', false);
    });

    it('basic deduplicate', async () => {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 2 && (await workspacePage.getActiveLeaf())[1] == "B.md"
        )
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('basic deduplicate 3 files', async () => {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.openFile("D.md");

        await workspacePage.setActiveFile("B.md");
        (await workspacePage.getLink("A")).click();

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 3 && (await workspacePage.getActiveLeaf())[1] == "A.md"
        )
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "A.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "D.md"]])
    })

    it('re-open file', async () => {
        await workspacePage.openFile("A.md");
        await workspacePage.openFileViaModal("A.md");
        await sleep(250);
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "A.md"]);
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"]]);
    })

    it('re-open self link', async () => {
        await workspacePage.openFile("Loop.md");
        (await workspacePage.getLink("Loop.md")).click();
        await sleep(250);
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "Loop.md"]);
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "Loop.md"]]);
    })

    it("open self link in new tab focusNewTab true", async () => {
        await workspacePage.setConfig('focusNewTab', true);

        await workspacePage.openFile("Loop.md");
        (await workspacePage.getLink("Loop.md")).click({button: "middle"});
        await sleep(250);
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "Loop.md"]])
    })

    it("open self link in new tab focusNewTab false", async () => {
        await workspacePage.setConfig('focusNewTab', false);

        await workspacePage.openFile("Loop.md");
        (await workspacePage.getLink("Loop.md")).click({button: "middle"});
        await sleep(250);
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "Loop.md"]])
    })

    it('deduplicate via file explorer', async () => {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openFileViaFileExplorer("B.md")

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 2 && (await workspacePage.getActiveLeaf())[1] == "B.md"
        )
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('deduplicate via sidebar', async () => {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        const button = await browser.$$(".workspace-tab-header").find(e => e.$("div.*=Outgoing links").isExisting()) as any
        await button.click()
        const item = await browser.$(".workspace-leaf-content[data-type='outgoing-link']").$("div=B");
        await item.click()

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 2 && (await workspacePage.getActiveLeaf())[1] == "B.md"
        )
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('deduplicate via file modal', async () => {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("B.md");
        await workspacePage.openFileViaModal("A.md")

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 2 && (await workspacePage.getActiveLeaf())[1] == "A.md"
        )
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "A.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('deduplicate with multiple matches', async () => {
        await setSettings({ deduplicateTabs: false });
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.openFile("B.md");
        await setSettings({ deduplicateTabs: true });

        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 3 && (await workspacePage.getActiveLeaf())[1] == "B.md"
        )
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"]])
    })

    it('deduplicate with multiple matches on current file', async () => {
        await setSettings({ deduplicateTabs: false });
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("Loop.md");
        await workspacePage.openFile("Loop.md");
        await setSettings({ deduplicateTabs: true });

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

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 3 && await workspacePage.getActiveLeafId() == loop2
        )
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "Loop.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "Loop.md"], ["markdown", "Loop.md"]])
    })

    it('dedup images', async () => {
        await workspacePage.openFile("image.png");
        await workspacePage.openFile("A.md");
        await workspacePage.openFileViaModal("image.png")
        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 2 && (await workspacePage.getActiveLeaf())[1] == "image.png"
        )
        expect(await workspacePage.getAllLeaves()).to.eql([["image", "image.png"], ["markdown", "A.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["image", "image.png"])
    })

    it('dedup png', async () => {
        await workspacePage.openFile("pdf.pdf");
        await workspacePage.openFile("A.md");
        await workspacePage.openFileViaModal("pdf.pdf")
        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 2 && (await workspacePage.getActiveLeaf())[1] == "pdf.pdf"
        )
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["pdf", "pdf.pdf"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["pdf", "pdf.pdf"])
    })

    it('empty tab', async () => {
        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.openFileViaModal("A.md")
        await browser.waitUntil(async () =>  (await workspacePage.getActiveLeaf())[1] == "A.md")
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "A.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"]])
    })

    it('explicit new tab', async () => {
        await workspacePage.setConfig('focusNewTab', true);
        await workspacePage.openFile("B.md");
        await workspacePage.openFile("A.md");
        (await workspacePage.getLink("B")).click({button: "middle"});

        // Should still deduplicate if opened in new tab explicitly
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md")
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]]);
    })
})
