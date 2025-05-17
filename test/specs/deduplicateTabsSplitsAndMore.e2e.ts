import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';
import { sleep } from './helpers';


describe('Test deduplicate for splits and more', function() {
    beforeEach(async function() {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: false, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', true);
    });

    it('open to the right', async function() {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        const b1 = await workspacePage.getActiveLeafId();
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));

        // Should create a new tab despite deduplicate
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);

        const b2 = await workspacePage.getActiveLeafId();
        expect(b1).not.toEqual(b2);
        expect(await workspacePage.getLeafParent(b1)).not.toEqual(await workspacePage.getLeafParent(b2));
    })

    it('open in popout window', async function() {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        const b1 = await workspacePage.getActiveLeafId();
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewWindow(await workspacePage.getLink("B"));

        // Should create a new tab despite deduplicate
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"],
        ]);

        const b2 = await workspacePage.getActiveLeafId();
        expect(b1).not.toEqual(b2);
        expect(await workspacePage.getLeafContainer(b1)).not.toEqual(await workspacePage.getLeafContainer(b2));
    })

    it('dedup across panes', async function() {
        // A and Loop split left/right
        await obsidianPage.loadWorkspaceLayout("split");
        await workspacePage.setActiveFile("Loop.md");
        (await workspacePage.getLink("B")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
    })

    it('dedup across windows', async function() {
        // A and Loop split left/right
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await browser.executeObsidianCommand('workspace:move-to-new-window')
        await sleep(250);

        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
    })

    it('outlinks', async function() {
        // Make sure outlinks don't get picked up as a file
        await obsidianPage.loadWorkspaceLayout("outgoing-links");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["outgoing-link", "B.md"],
        ]);
    })

    it('linked file', async function() {
        // Make sure outlinks don't get picked up as a file
        await obsidianPage.loadWorkspaceLayout("outgoing-links");
        await browser.$('.outgoing-link-pane').click()
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["outgoing-link", "B.md"]);
        await browser.$('.outgoing-link-pane').$("div=A").click();
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["outgoing-link", "B.md"],
        ]);
    })

    it('deferred views', async function() {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await browser.reloadObsidian();
        
        expect(await workspacePage.getLeavesWithDeferred()).toEqual([
            ['markdown', 'A.md', false], ['markdown', 'B.md', true],
        ])
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "A.md"]);

        (await workspacePage.getLink("B")).click();
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);;
        await workspacePage.waitUntilEqual(() => workspacePage.getLeavesWithDeferred(), [
            ['markdown', 'A.md', false], ['markdown', 'B.md', false],
        ]);
    })

    it("back buttons", async function() {
        await workspacePage.setSettings({ deduplicateTabs: false });
        await obsidianPage.openFile("B.md");
        await obsidianPage.openFile("B.md");
        await (await workspacePage.getLink("A")).click();
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"]])
        await workspacePage.setSettings({ deduplicateTabs: true });

        // Still opens in the same tab
        // TODO: Should we override go-back behavior as well?
        await browser.executeObsidianCommand("app:go-back");
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "B.md"], ["markdown", "B.md"]])

        await browser.executeObsidianCommand("app:go-forward");
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('stacked tabs', async function() {
        // Make sure outlinks don't get picked up as a file
        await obsidianPage.loadWorkspaceLayout("stacked");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 2 && (await workspacePage.getActiveLeaf())[1] == "B.md"
        )
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
    })
})
