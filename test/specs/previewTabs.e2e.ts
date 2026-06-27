import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Preview tabs', function() {
    beforeEach(async function() {
        await obsidianPage.resetVault();
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, previewTabs: true, deduplicateTabs: false });
        await workspacePage.setConfig('focusNewTab', false);
    });

    it('opens new tabs as preview tabs', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: true},
        ]]);
    })

    it('replaces the preview tab instead of opening a new tab', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: true},
        ]]);

        await workspacePage.openFileViaQuickSwitcher("D.md");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "D.md", active: true, isPreview: true},
        ]]);
    })

    it('promotes previews on edit', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: true},
        ]]);

        await workspacePage.editLeaf("B.md", "some edit");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", isPreview: false},
        ]]);

        await workspacePage.openFileViaQuickSwitcher("D.md");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", isPreview: false},
            {type: "markdown", file: "D.md", active: true, isPreview: true},
        ]]);
    })

    it('promotes previews on double click', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: true},
        ]]);

        await workspacePage.doubleClickTab("B.md");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", isPreview: false},
        ]]);
    })

    it('promotes previews on pin', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: true},
        ]]);

        await workspacePage.pinTab("B.md");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", isPreview: false},
        ]]);
    })

    it('promote twice', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: true},
        ]]);

        await workspacePage.editLeaf("B.md", "some edit");
        await browser.pause(500)
        await workspacePage.editLeaf("B.md", "another edit");
        // edits after the first should be ignored
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", isPreview: false},
        ]]);
    })

    it('multiple tabs in a group', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.doubleClickTab("B.md");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", isPreview: false},
        ]]);
        await workspacePage.setActiveFile("A.md");

        await workspacePage.openFileViaQuickSwitcher("D.md");
        await workspacePage.openFileViaQuickSwitcher("Loop.md");

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "Loop.md", active: true, isPreview: true},
            {type: "markdown", file: "B.md", isPreview: false},
        ]]);
    })

    it('open to right does not make a preview tab', async function() {
        if ((await obsidianPage.getPlatform()).isPhone) this.skip();

        await workspacePage.openFileViaFileExplorer("A.md");

        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md", isPreview: true}],
            [{type: "markdown", file: "B.md", active: true, isPreview: false}],
        ]);
    })

    it('can have a single preview tab per group', async function() {
        if ((await obsidianPage.getPlatform()).isPhone) this.skip();

        await workspacePage.openFileViaFileExplorer("A.md");

        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));
        await workspacePage.openFileViaFileExplorer("D.md");

        await workspacePage.matchWorkspace([
            [{file: "A.md", isPreview: true}],
            [{file: "B.md", isPreview: false}, {file: "D.md", active: true, isPreview: true}],
        ]);

        await workspacePage.openLink(await workspacePage.getLink("Loop"));

        await workspacePage.matchWorkspace([
            [{file: "A.md", isPreview: true}],
            [{file: "B.md", isPreview: false}, {file: "Loop.md", active: true, isPreview: true}],
        ]);

        await workspacePage.doubleClickTab("Loop.md")
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{file: "A.md", isPreview: true}],
            [
                {file: "B.md", isPreview: false},
                {file: "Loop.md", isPreview: false},
                {file: "B.md", active: true, isPreview: true},
            ],
        ]);
    })

    it('cleanup on setting disable', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: true},
        ]]);

        await workspacePage.setSettings({ previewTabs: false });
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: false},
        ]]);
    })

    it('with deduplicate', async function() {
        await workspacePage.setSettings({ deduplicateTabs: true });

        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: true},
        ]]);

        await workspacePage.openLink(await workspacePage.getLink("A"))
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true, isPreview: false},
            {type: "markdown", file: "B.md", isPreview: true},
        ]]);

        await workspacePage.openLink(await workspacePage.getLink("B"))
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: true},
        ]]);
    })
})
