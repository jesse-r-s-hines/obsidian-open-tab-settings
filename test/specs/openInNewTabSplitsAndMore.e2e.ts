import { browser } from '@wdio/globals'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { setSettings } from './helpers';


describe('Test open in new tab for splits and more', () => {
    beforeEach(async () => {
        await workspacePage.loadWorkspaceLayout("empty");
        await setSettings({ openInNewTab: true });
        await workspacePage.setConfig('focusNewTab', false);
    });

    it('test split view left', async () => {
        await workspacePage.loadWorkspaceLayout("split");
        // A is in left, Loop is in right
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 3)
        expect(await workspacePage.getAllLeaves()).to.eql([
            ["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "Loop.md"],
        ])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])

        // Should open in the left pane since we clicked the link in the left pane.
        const aParent = await workspacePage.getLeafParent("A.md");
        const bParent = await workspacePage.getLeafParent("B.md");
        expect(aParent).to.eql(bParent);
    })

    it('test split view right', async () => {
        await workspacePage.loadWorkspaceLayout("split");
        // A is in left, Loop is in right
        await workspacePage.setActiveFile("Loop.md");
        (await workspacePage.getLink("B")).click();
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 3)
        expect(await workspacePage.getAllLeaves()).to.eql([
            ["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "Loop.md"],
        ])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        const bParent = await workspacePage.getLeafParent("B.md");
        const loopParent = await workspacePage.getLeafParent("Loop.md");
        expect(bParent).to.eql(loopParent);
    })
})
