import { browser } from '@wdio/globals'
import workspacePage from '../pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test undo close tab', function() {
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({
            openInNewTab: false, deduplicateTabs: false,
            newTabPlacement: "afterActive", newTabTabGroupPlacement: "same",
        });
        await workspacePage.setConfig('focusNewTab', false);
    })

    async function openFiles(...files: string[]) {
        for (const file of files) {
            await workspacePage.openFile(file);
        }
        await workspacePage.matchWorkspace([files.map(file => ({type: "markdown", file}))]);
    }

    async function closeTab(file: string) {
        await workspacePage.setActiveFile(file);
        await browser.executeObsidianCommand("workspace:close");
    }

    async function undoCloseTab() {
        await browser.executeObsidianCommand("workspace:undo-close-pane");
    }

    it('undo close tab newTabPlacement afterActive', async function() {
        await openFiles("A.md", "B.md", "D.md", "Loop.md");
        await closeTab("Loop.md");
        await workspacePage.setActiveFile("A.md");

        await undoCloseTab();
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "Loop.md", active: true},
            {type: "markdown", file: "B.md"},
            {type: "markdown", file: "D.md"},
        ]]);
    })

    it('undo close tab newTabPlacement beginning', async function() {
        await workspacePage.setSettings({newTabPlacement: "beginning"});
        await openFiles("A.md", "B.md", "D.md");
        await closeTab("D.md");
        await workspacePage.setActiveFile("B.md");

        await undoCloseTab();
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "D.md", active: true},
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "B.md"},
        ]]);
    })

    it('undo close tab newTabPlacement afterPinned', async function() {
        await workspacePage.setSettings({newTabPlacement: "afterPinned"});
        await openFiles("A.md", "B.md", "D.md", "Loop.md");
        await workspacePage.pinTab("A.md");
        await workspacePage.pinTab("B.md");
        await closeTab("Loop.md");
        await workspacePage.setActiveFile("A.md");

        await undoCloseTab();
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", pinned: true},
            {type: "markdown", file: "B.md", pinned: true},
            {type: "markdown", file: "Loop.md", active: true},
            {type: "markdown", file: "D.md"},
        ]]);
    })

    it('undo close tab newTabPlacement end', async function() {
        await workspacePage.setSettings({newTabPlacement: "end"});
        await openFiles("A.md", "B.md", "D.md");
        await closeTab("B.md");
        await workspacePage.setActiveFile("A.md");

        await undoCloseTab();
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "D.md"},
            {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('undo close tab multiple times', async function() {
        await openFiles("A.md", "B.md", "D.md");
        await closeTab("B.md");
        await closeTab("D.md");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
        ]]);

        await undoCloseTab();
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "D.md", active: true},
        ]]);
        await workspacePage.setActiveFile("A.md");
        await undoCloseTab();
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "B.md", active: true},
            {type: "markdown", file: "D.md"},
        ]]);
    })

    it('undo close tab in another tab group', async function() {
        if ((await obsidianPage.getPlatform()).isPhone) this.skip();
        // A is in left, Loop is in right
        await workspacePage.loadPlatformWorkspaceLayout("split");
        await workspacePage.setActiveFile("Loop.md");
        await workspacePage.openFile("B.md");
        await workspacePage.openFile("D.md");
        await workspacePage.setActiveFile("B.md");
        await closeTab("Loop.md");
        await workspacePage.setActiveFile("A.md");

        // reopens in its old tab group, which isn't the active one, so newTabPlacement afterActive puts it at the end
        await undoCloseTab();
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [
                {type: "markdown", file: "B.md"},
                {type: "markdown", file: "D.md"},
                {type: "markdown", file: "Loop.md", active: true},
            ],
        ]);
    })
});
