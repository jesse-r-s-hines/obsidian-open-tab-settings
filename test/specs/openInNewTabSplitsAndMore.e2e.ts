import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';
import { sleep } from './helpers';
import { WorkspaceLeaf } from 'obsidian';


describe('Test open in new tab for splits and more', function() {
    beforeEach(async function() {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: false });
        await workspacePage.setConfig('focusNewTab', false);
    });

    it('test split view left', async function() {
        await obsidianPage.loadWorkspaceLayout("split");
        // A is in left, Loop is in right
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "Loop.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);

        // Should open in the left pane since we clicked the link in the left pane.
        const aParent = await workspacePage.getLeafParent("A.md");
        const bParent = await workspacePage.getLeafParent("B.md");
        expect(aParent).toEqual(bParent);
    })

    it('test split view right', async function() {
        await obsidianPage.loadWorkspaceLayout("split");
        // A is in left, Loop is in right
        await workspacePage.setActiveFile("Loop.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "Loop.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        const bParent = await workspacePage.getLeafParent("B.md");
        const loopParent = await workspacePage.getLeafParent("Loop.md");
        expect(bParent).toEqual(loopParent);
    })

    it("test new tabs in new windows", async function() {
        // A in main, D in a popout window
        await obsidianPage.loadWorkspaceLayout("popout-window");
        // If I don't wait a bit here, there's a race condition and sometimes the popout window will end up
        // focused despite setting the active file below. TODO: Figure out what I need to waitUtil
        await sleep(250);
        await workspacePage.setActiveFile("A.md");

        const mainWindow = await browser.getWindowHandle();
        const otherWindow = (await browser.getWindowHandles()).find(h => h != mainWindow)!;

        await workspacePage.openLink(await workspacePage.getLink("B"));
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 3)
        const aContainer = await workspacePage.getLeafContainer("A.md");
        const bContainer = await workspacePage.getLeafContainer("B.md");
        expect(aContainer).toEqual(bContainer);

        await browser.switchToWindow(otherWindow);
        await workspacePage.setActiveFile("D.md");
        await workspacePage.openLink(await workspacePage.getLink("Loop"))
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 4)
        const dContainer = await workspacePage.getLeafContainer("D.md");
        const loopContainer = await workspacePage.getLeafContainer("Loop.md");
        expect(dContainer).toEqual(loopContainer);
        expect(aContainer).not.toEqual(dContainer);

        await browser.switchToWindow(mainWindow)
    })

    it("test sidebars", async function() {
        await obsidianPage.loadWorkspaceLayout("file-a-in-sidebar");
        const sidebar = $(await browser.executeObsidian(({app}) => app.workspace.rightSplit.containerEl))
        await sidebar.$(`a=B`).click();
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [["markdown", "B.md"]]);
        
        const [sidebarId, aMatches] = await browser.executeObsidian(({app, obsidian}) => {
            const sidebar = app.workspace.rightSplit
            const matches: WorkspaceLeaf[] = []
            app.workspace.iterateAllLeaves(l => {
                if (l.view instanceof obsidian.MarkdownView && l.view.file?.path == "A.md") {
                    matches.push(l)
                }
            })
            return [sidebar.id, matches.map(l => l.getRoot().id)]
        });
        expect(aMatches.length).toEqual(1);
        expect(aMatches[0]).toEqual(sidebarId);
    })

    it("test linked files", async function() {
        // A.md and outgoing links in left/right split
        await obsidianPage.loadWorkspaceLayout("linked-files");
        
        const fileLeafId = await browser.executeObsidian(({app}) => {
            return (app.workspace.rootSplit as any).children[0].children[0].id
        });
        await browser.executeObsidian(({app}, leafId) => {
            const leaf = app.workspace.getLeafById(leafId)!
            app.workspace.setActiveLeaf(leaf, {focus: true});
        }, fileLeafId);
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["outgoing-link", "A.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it("test back buttons", async function() {
        await workspacePage.setSettings({ openInNewTab: false });
        await obsidianPage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [["markdown", "B.md"]]);
        await workspacePage.setSettings({ openInNewTab: true });

        // Still opens in the same tab
        await browser.executeObsidianCommand("app:go-back");
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "A.md"]])

        await browser.executeObsidianCommand("app:go-forward");
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "B.md"]])
    })

    it('stacked tabs', async function() {
        await obsidianPage.loadWorkspaceLayout("stacked");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"))

        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })
})
