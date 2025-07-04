import { browser } from '@wdio/globals'
import { obsidianPage } from 'wdio-obsidian-service';
import workspacePage from 'test/pageobjects/workspace.page';

describe('Plugin compatibility', function() {
    beforeEach(async function() {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });
    });

    describe("Excalidraw", function () {
        before(async function() { await obsidianPage.enablePlugin("obsidian-excalidraw-plugin") });
        after(async function() { await obsidianPage.disablePlugin("obsidian-excalidraw-plugin") });

        it('deduplicates drawings', async function() {
            await workspacePage.openFile("D.md");
            await workspacePage.openFile("Drawing.excalidraw.md");
            await workspacePage.setActiveFile("D.md");

            await workspacePage.openLink(await workspacePage.getLink("Drawing.excalidraw"));

            await workspacePage.matchWorkspace([[
                {type: "markdown", file: "D.md"},
                {type: "excalidraw", file: "Drawing.excalidraw.md", active: true},
            ]]);
        })
    })

    describe("Home tab", function () {
        before(async function() { await obsidianPage.enablePlugin("home-tab"); });
        after(async function() { await obsidianPage.disablePlugin("home-tab") });

        it('treats as empty', async function() {
            await workspacePage.setSettings({newTabPlacement: "end"});
            await workspacePage.setActiveFile((await workspacePage.getAllLeaves())[0][0].id);
            await workspacePage.matchWorkspace([[ {type: "home-tab-view", active: true} ]]);
            await workspacePage.openFileViaQuickSwitcher("B.md");
            await workspacePage.matchWorkspace([[
                {type: "markdown", file: "B.md", active: true},
            ]]);
        })
    })

    describe("Kanban", function () {
        before(async function() { await obsidianPage.enablePlugin("obsidian-kanban") });
        after(async function() { await obsidianPage.disablePlugin("obsidian-kanban") });

        it('deduplicates kanban', async function() {
            await workspacePage.openFile("Kanban.md");
            await workspacePage.openFile("A.md");

            await workspacePage.matchWorkspace([[
                {type: "kanban", file: "Kanban.md"},
                {type: "markdown", file: "A.md", active: true},
            ]]);

            // Test kanban deduplication and workaround for bug in kanban.
            await workspacePage.openFileViaQuickSwitcher("Kanban.md");

            await workspacePage.matchWorkspace([[
                {type: "kanban", file: "Kanban.md", active: true},
                {type: "markdown", file: "A.md"},
            ]]);

            const activeView = $(await browser.executeObsidian(({app, obsidian}) =>
                app.workspace.getMostRecentLeaf()!.view.containerEl
            ));
            await expect(activeView).toHaveText("My Card", {containing: true});
        })
    })
})
