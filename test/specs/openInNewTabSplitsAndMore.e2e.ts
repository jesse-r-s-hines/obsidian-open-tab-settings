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

    it("test new tabs in new windows", async () => {
        // A in main, D in a popout window
        await workspacePage.loadWorkspaceLayout("popout-window");
        // If I don't wait a bit here, there's a race condition and sometimes the popout window will end up
        // focused despite setting the active file below. TODO: Figure out what I need to waitUtil
        await new Promise(r => setTimeout(r, 100));
        await workspacePage.setActiveFile("A.md");

        const mainWindow = await browser.getWindowHandle();
        const otherWindow = (await browser.getWindowHandles()).find(h => h != mainWindow)!;

        (await workspacePage.getLink("B")).click();
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 3)
        const aContainer = await workspacePage.getLeafContainer("A.md");
        const bContainer = await workspacePage.getLeafContainer("B.md");
        expect(aContainer).to.eql(bContainer)

        await browser.switchToWindow(otherWindow);
        await workspacePage.setActiveFile("D.md");
        await (await workspacePage.getLink("Loop")).click()
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 4)
        const dContainer = await workspacePage.getLeafContainer("D.md");
        const loopContainer = await workspacePage.getLeafContainer("Loop.md");
        expect(dContainer).to.eql(loopContainer)
        expect(aContainer).to.not.eql(dContainer)

        await browser.switchToWindow(mainWindow)
    })
})
