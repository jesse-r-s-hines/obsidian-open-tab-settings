import workspacePage from 'test/pageobjects/workspace.page';
import { sleep } from './helpers';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test basic deduplicate', function() {
    beforeEach(async function() {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', true);
    });

    it('basic dedup', async function() {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it('basic new tab', async function() {
        await obsidianPage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it('self link', async function() {
        await obsidianPage.openFile("Loop.md");
        await workspacePage.openLink(await workspacePage.getLink("Loop.md"));
        await sleep(250);
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "Loop.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "Loop.md"]]);
    })
})
