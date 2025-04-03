import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';
import { setSettings, sleep } from './helpers';


describe('Test deduplicate for splits and more', () => {
    beforeEach(async () => {
        await obsidianPage.loadWorkspaceLayout("empty");
        await setSettings({ openInNewTab: false, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', true);
    });

    it('open to the right', async () => {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        const b1 = await workspacePage.getActiveLeafId();
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length == 3)
        // Should create a new tab despite deduplicate
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"]])

        const b2 = await workspacePage.getActiveLeafId();
        expect(b1).not.toEqual(b2);
        expect(await workspacePage.getLeafParent(b1)).not.toEqual(await workspacePage.getLeafParent(b2));
    })

    it('open in popout window', async () => {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        const b1 = await workspacePage.getActiveLeafId();
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewWindow(await workspacePage.getLink("B"));

        await browser.waitUntil(async () =>
            (await workspacePage.getAllLeaves()).length == 3 && (await workspacePage.getActiveLeaf())[1] == "B.md"
        )
        // Should create a new tab despite deduplicate
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"]])

        const b2 = await workspacePage.getActiveLeafId();
        expect(b1).not.toEqual(b2);
        expect(await workspacePage.getLeafContainer(b1)).not.toEqual(await workspacePage.getLeafContainer(b2));
    })

    it('dedup across panes', async () => {
        // A and Loop split left/right
        await obsidianPage.loadWorkspaceLayout("split");
        await workspacePage.setActiveFile("Loop.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md")
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md")

        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('dedup across windows', async () => {
        // A and Loop split left/right
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await browser.executeObsidianCommand('workspace:move-to-new-window')
        await sleep(250);

        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md")
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('outlinks', async () => {
        // Make sure outlinks don't get picked up as a file
        await obsidianPage.loadWorkspaceLayout("outgoing-links");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md")
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"], ["outgoing-link", "B.md"]])
    })

    it('linked file', async () => {
        // Make sure outlinks don't get picked up as a file
        await obsidianPage.loadWorkspaceLayout("outgoing-links");
        await browser.$('.outgoing-link-pane').click()
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md")
        await browser.$('.outgoing-link-pane').$("div=A").click();
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "A.md")
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "A.md"])
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"], ["outgoing-link", "B.md"]])
    })

    it('deferred views', async () => {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await browser.reloadObsidian();
        
        expect(await workspacePage.getLeavesWithDeferred()).toEqual([
            ['markdown', 'A.md', false], ['markdown', 'B.md', true],
        ])
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "A.md"]);

        (await workspacePage.getLink("B")).click();
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md");
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "B.md"]);
        expect(await workspacePage.getLeavesWithDeferred()).toEqual([
            ['markdown', 'A.md', false], ['markdown', 'B.md', false],
        ])
    })

    it("back buttons", async () => {
        await setSettings({ deduplicateTabs: false });
        await obsidianPage.openFile("B.md");
        await obsidianPage.openFile("B.md");
        await (await workspacePage.getLink("A")).click();
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "A.md");
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"]])
        await setSettings({ deduplicateTabs: true });

        // Still opens in the same tab
        // TODO: Should we override go-back behavior as well?
        await browser.executeObsidianCommand("app:go-back");
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md");
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "B.md"], ["markdown", "B.md"]])

        await browser.executeObsidianCommand("app:go-forward");
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "A.md");
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('stacked tabs', async () => {
        // Make sure outlinks don't get picked up as a file
        await obsidianPage.loadWorkspaceLayout("stacked");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 2 && (await workspacePage.getActiveLeaf())[1] == "B.md"
        )
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"]])
    })
})
