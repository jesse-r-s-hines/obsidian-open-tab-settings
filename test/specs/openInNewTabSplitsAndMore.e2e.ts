import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';
import { sleep } from '../helpers';
import { WorkspaceLeaf } from 'obsidian';


describe('Test open in new tab for splits and more', function() {
    let mainWindow: string|undefined
    before(async function() {
        mainWindow = await browser.getWindowHandle();
    })

    beforeEach(async function() {
        await browser.switchToWindow(mainWindow!);
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: false });
        await workspacePage.setConfig('focusNewTab', false);
    });

    it('test split view left', async function() {
        await obsidianPage.loadWorkspaceLayout("split");
        // A is in left, Loop is in right
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true}],
            [{type: "markdown", file: "Loop.md"}],
        ]);
    });

    it('test split view right', async function() {
        await obsidianPage.loadWorkspaceLayout("split");
        // A is in left, Loop is in right
        await workspacePage.setActiveFile("Loop.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [{type: "markdown", file: "Loop.md"}, {type: "markdown", file: "B.md", active: true}],
        ]);
    })

    it("test new tabs in new windows", async function() {
        // A in main, D in a popout window
        await obsidianPage.loadWorkspaceLayout("popout-window");
        // If I don't wait a bit here, there's a race condition and sometimes the popout window will end up
        // focused despite setting the active file below. TODO: Figure out what I need to waitUtil
        await sleep(250);
        await workspacePage.setActiveFile("A.md");

        const otherWindow = (await browser.getWindowHandles()).find(h => h != mainWindow)!;

        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([
            [{file: "A.md"}, {file: "B.md", active: true}],
            [{file: "D.md"}],
        ]);

        await browser.switchToWindow(otherWindow);

        await workspacePage.setActiveFile("D.md");
        await workspacePage.openLink(await workspacePage.getLink("Loop"));
        await workspacePage.matchWorkspace([
            [{file: "A.md"}, {file: "B.md"}],
            [{file: "D.md"}, {file: "Loop.md", active: true}],
        ]);
    })

    it("test sidebars", async function() {
        await obsidianPage.loadWorkspaceLayout("file-a-in-sidebar");
        const sidebar = $(await browser.executeObsidian(({app}) => app.workspace.rightSplit.containerEl))
        await sidebar.$(`.//a[contains(@class, 'internal-link') and text() = 'B']`).click();
        await workspacePage.matchWorkspace([[{type: "markdown", file: "B.md"}]]);
        
        const [sidebarId, aMatches] = await browser.executeObsidian(({app, obsidian}) => {
            const sidebar = app.workspace.rightSplit;
            const matches: WorkspaceLeaf[] = [];
            app.workspace.iterateAllLeaves(l => {
                if (l.view instanceof obsidian.MarkdownView && l.view.file?.path == "A.md") {
                    matches.push(l);
                }
            });
            return [sidebar.id, matches.map(l => l.getRoot().id)]
        });
        expect(aMatches.length).toEqual(1);
        expect(aMatches[0]).toEqual(sidebarId);
    })

    it("test linked files", async function() {
        // A.md and outgoing links in left/right split
        await obsidianPage.loadWorkspaceLayout("linked-files");

        const fileLeaf = (await workspacePage.getAllLeaves())[0][0];
        expect(fileLeaf.type).toEqual("markdown");
        
        await workspacePage.setActiveFile(fileLeaf.id);
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true}],
            [{type: "outgoing-link", file: "A.md"}],
        ]);
    })

    it("test back buttons", async function() {
        await workspacePage.setSettings({ openInNewTab: false });
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[{type: "markdown", file: "B.md", active: true}]]);
        await workspacePage.setSettings({ openInNewTab: true });

        // Still opens in the same tab
        await browser.executeObsidianCommand("app:go-back");
        await workspacePage.matchWorkspace([[{type: "markdown", file: "A.md", active: true}]]);

        await browser.executeObsidianCommand("app:go-forward");
        await workspacePage.matchWorkspace([[{type: "markdown", file: "B.md", active: true}]]);
    })

    it('stacked tabs', async function() {
        await obsidianPage.loadWorkspaceLayout("stacked");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"))

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "B.md", active: true},
            {type: "markdown", file: "B.md"},
        ]]);
    })
})
