import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { sleep } from './helpers';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test basic deduplicate', () => {
    beforeEach(async () => {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', true);
    });

    it('basic dedup', async () => {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 2 && (await workspacePage.getActiveLeaf())[1] == "B.md"
        )
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('basic new tab', async () => {
        await obsidianPage.openFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length == 2)
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('self link', async () => {
        await obsidianPage.openFile("Loop.md");
        (await workspacePage.getLink("Loop.md")).click();
        await sleep(250);
        expect(await workspacePage.getActiveLeaf()).toEqual(["markdown", "Loop.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "Loop.md"]]);
    })
})
