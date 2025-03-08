import { browser } from '@wdio/globals'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { setSettings, sleep } from './helpers';


describe('Test basic deduplicate', () => {
    beforeEach(async () => {
        await workspacePage.loadWorkspaceLayout("empty");
        await setSettings({ openInNewTab: true, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', true);
    });

    it('basic dedup', async () => {
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

    it('basic new tab', async () => {
        await workspacePage.openFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length == 2)
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
    })

    it('self link', async () => {
        await workspacePage.openFile("Loop.md");
        (await workspacePage.getLink("Loop.md")).click();
        await sleep(250);
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "Loop.md"]);
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "Loop.md"]]);
    })
})
