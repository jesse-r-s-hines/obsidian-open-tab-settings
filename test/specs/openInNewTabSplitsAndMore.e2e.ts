import { browser } from '@wdio/globals'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { setSettings, sleep } from './helpers';
import { WorkspaceLeaf } from 'obsidian';


describe('Test open in new tab for splits and more', () => {
    beforeEach(async () => {
        await workspacePage.loadWorkspaceLayout("empty");
        await setSettings({ openInNewTab: true, deduplicateTabs: false });
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
        await sleep(250);
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

    it("test sidebars", async () => {
        await workspacePage.loadWorkspaceLayout("file-a-in-sidebar");
        const sidebar = $(await browser.executeObsidian(({app}) => app.workspace.rightSplit.containerEl))
        await sidebar.$(`a=B`).click()
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves())[0][0] != 'empty')
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "B.md"]])
        
        const [sidebarId, aMatches] = await browser.executeObsidian(({app, obsidian}) => {
            const sidebar = app.workspace.rightSplit
            const matches: WorkspaceLeaf[] = []
            app.workspace.iterateAllLeaves(l => {
                if (l.view instanceof obsidian.MarkdownView && l.view.file?.path == "A.md") {
                    matches.push(l)
                }
            })
            return [sidebar.id, matches.map(l => l.getRoot().id)]
        })
        expect(aMatches.length).to.eql(1);
        expect(aMatches[0]).to.eql(sidebarId);
    })

    it("test linked files", async () => {
        // A.md and outgoing links in left/right split
        await workspacePage.loadWorkspaceLayout("linked-files");
        
        const fileLeafId = await browser.executeObsidian(({app}) => {
            return (app.workspace.rootSplit as any).children[0].children[0].id
        });
        await browser.executeObsidian(({app}, leafId) => {
            const leaf = app.workspace.getLeafById(leafId)!
            app.workspace.setActiveLeaf(leaf, {focus: true});
        }, fileLeafId);
        (await workspacePage.getLink("B")).click();
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 3)

        expect(await workspacePage.getAllLeaves()).to.eql([
            ["markdown", "A.md"], ["markdown", "B.md"], ["outgoing-link", "A.md"],
        ])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
    })

    it("test back buttons", async () => {
        await setSettings({ openInNewTab: false });
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click();
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md");
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "B.md"]])
        await setSettings({ openInNewTab: true });

        // Still opens in the same tab
        await browser.executeObsidianCommand("app:go-back");
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "A.md");
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"]])

        await browser.executeObsidianCommand("app:go-forward");
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md");
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "B.md"]])
    })
})
