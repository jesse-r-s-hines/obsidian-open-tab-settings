import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Preview tabs', function() {
    let mainWindow: string|undefined

    before(async function() {
        mainWindow = await browser.getWindowHandle();
        if ((await obsidianPage.getPlatform()).isPhone) this.skip();
    })

    beforeEach(async function() {
        await browser.switchToWindow(mainWindow!);
        await obsidianPage.resetVault();
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettingsDefaults({ openInNewTab: true, previewTabs: true, deduplicateTabs: false });
        await workspacePage.setConfig('focusNewTab', false);
    });

    after(async function() {
        await browser.switchToWindow(mainWindow!);
    })

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

    it("open new file via file explorer double click", async function() {
        if ((await obsidianPage.getPlatform()).isPhone) this.skip();
        const expandAllButton = $(".nav-action-button[aria-label='Expand all']");
        if (await expandAllButton.isExisting()) await expandAllButton.click();

        await $(".nav-files-container [data-path='A.md']").doubleClick();
        await workspacePage.matchWorkspace([[
            {file: "A.md", isPreview: false},
        ]]);
    });

    it("file explorer double click open file", async function() {
        if ((await obsidianPage.getPlatform()).isPhone) this.skip();
        await workspacePage.openFileViaFileExplorer("A.md");
        await workspacePage.matchWorkspace([[
            {file: "A.md", isPreview: true, currentTab: true},
        ]]);
        await $(".nav-files-container [data-path='A.md']").doubleClick();
        await workspacePage.matchWorkspace([[
            {file: "A.md", isPreview: false, currentTab: true},
        ]]);

        // repeat has no effect
        await $(".nav-files-container [data-path='A.md']").doubleClick();
        await workspacePage.matchWorkspace([[
            {file: "A.md", isPreview: false, currentTab: true},
        ]]);
    });

    it("file explorer double click uses most recent", async function() {
        if ((await obsidianPage.getPlatform()).isPhone) this.skip();

        await workspacePage.openFileViaFileExplorer("A.md");
        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));
        await workspacePage.openFileViaFileExplorer("A.md");

        await workspacePage.matchWorkspace([
            [{file: "A.md", isPreview: true}],
            [{file: "B.md", isPreview: false}, {file: "A.md", isPreview: true, active: true}],
        ]);

        await $(".nav-files-container [data-path='A.md']").doubleClick();
        await workspacePage.matchWorkspace([
            [{file: "A.md", isPreview: true}],
            [{file: "B.md", isPreview: false}, {file: "A.md", isPreview: false}],
        ]);
    });

    it("file explorer double click uses most recent 2", async function() {
        if ((await obsidianPage.getPlatform()).isPhone) this.skip();

        await workspacePage.openFileViaFileExplorer("A.md");
        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));
        await workspacePage.openFileViaFileExplorer("A.md");
        await workspacePage.setActiveFile((await workspacePage.getAllLeaves())[0][0].id);

        await workspacePage.matchWorkspace([
            [{file: "A.md", isPreview: true, active: true}],
            [{file: "B.md", isPreview: false}, {file: "A.md", isPreview: true}],
        ]);

        await $(".nav-files-container [data-path='A.md']").doubleClick();
        await workspacePage.matchWorkspace([
            [{file: "A.md", isPreview: false}],
            [{file: "B.md", isPreview: false}, {file: "A.md", isPreview: true}],
        ]);
    });

    it("normal link", async function() {
        if ((await obsidianPage.getPlatform()).isPhone) this.skip();
        await workspacePage.setSettings({ newTabTabGroupPlacement: "opposite" });
        await workspacePage.loadPlatformWorkspaceLayout("split");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.matchWorkspace([
            [{file: "A.md", isPreview: false, active: true}],
            [{file: "Loop.md", isPreview: false}],
        ]);

        const link = await workspacePage.getLink("B");
        await workspacePage.openLink(link);
        await workspacePage.matchWorkspace([
            [{file: "A.md", isPreview: false}],
            [{file: "Loop.md", isPreview: false}, {file: "B.md", isPreview: true}],
        ]);

        link.doubleClick();
        await workspacePage.matchWorkspace([
            [{file: "A.md", isPreview: false}],
            [{file: "Loop.md", isPreview: false}, {file: "B.md", isPreview: false}],
        ]);
    });

    it("normal link in popout window as preview", async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();
        await workspacePage.setSettings({ newTabTabGroupPlacement: "opposite", deduplicateTabs: false });
        await workspacePage.loadPlatformWorkspaceLayout("split-popout-window");
        await browser.pause(250);
        
        const otherWindow = (await browser.getWindowHandles()).find(h => h != mainWindow)!;
        await browser.switchToWindow(otherWindow);
        await workspacePage.setActiveFile("D.md");
        await workspacePage.matchWorkspace([
            [{ "file": "A.md", "isPreview": false}], // win 1
            [{"file": "D.md", "isPreview": false, "active": true}], // win 2 left
            [{"file": "Loop.md", "isPreview": false}], // win 2 right
        ]);

        (await workspacePage.getLink("Loop")).click();

        await workspacePage.matchWorkspace([
            [{ "file": "A.md", "isPreview": false}], // win 1
            [{"file": "D.md", "isPreview": false}], // win 2 left
            [{"file": "Loop.md", "isPreview": false}, {"file": "Loop.md", "isPreview": true, "active": true}], // win 2 right
        ]);
    });

    it("normal link in popout window as non preview", async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();
        await workspacePage.setSettings({ newTabTabGroupPlacement: "opposite", deduplicateTabs: false });
        await workspacePage.loadPlatformWorkspaceLayout("split-popout-window");

        await browser.pause(250);
        const otherWindow = (await browser.getWindowHandles()).find(h => h != mainWindow)!;
        await browser.switchToWindow(otherWindow);
        await browser.pause(250);

        await workspacePage.setActiveFile("D.md");
    
        await workspacePage.matchWorkspace([
            [{ "file": "A.md", "isPreview": false}], // win 1
            [{"file": "D.md", "isPreview": false, "active": true}], // win 2 left
            [{"file": "Loop.md", "isPreview": false}], // win 2 right
        ]);

        (await workspacePage.getLink("Loop")).doubleClick();

        await workspacePage.matchWorkspace([
            [{ "file": "A.md", "isPreview": false}], // win 1
            [{"file": "D.md", "isPreview": false}], // win 2 left
            [{"file": "Loop.md", "isPreview": false}, {"file": "Loop.md", "isPreview": false, "active": true}], // win 2 right
        ]);
    });
})
