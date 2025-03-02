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
})
