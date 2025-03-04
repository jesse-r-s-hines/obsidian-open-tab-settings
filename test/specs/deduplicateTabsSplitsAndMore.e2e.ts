import { browser } from '@wdio/globals'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { setSettings, sleep } from './helpers';


describe('Test deduplicate for splits and more', () => {
    beforeEach(async () => {
        await workspacePage.loadWorkspaceLayout("empty");
        await setSettings({ openInNewTab: false, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', true);
    });

    it('open to the right', async () => {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        const b1 = await workspacePage.getActiveLeafId();
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length == 3)
        // Should create a new tab despite deduplicate
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"]])

        const b2 = await workspacePage.getActiveLeafId();
        expect(b1).to.not.eql(b2);
        expect(await workspacePage.getLeafParent(b1)).to.not.eql(await workspacePage.getLeafParent(b2));
    })

    it('open in popout window', async () => {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        const b1 = await workspacePage.getActiveLeafId();
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewWindow(await workspacePage.getLink("B"));

        await browser.waitUntil(async () =>
            (await workspacePage.getAllLeaves()).length == 3 && (await workspacePage.getActiveLeaf())[1] == "B.md"
        )
        // Should create a new tab despite deduplicate
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"]])

        const b2 = await workspacePage.getActiveLeafId();
        expect(b1).to.not.eql(b2);
        expect(await workspacePage.getLeafContainer(b1)).to.not.eql(await workspacePage.getLeafContainer(b2));
    })
})
