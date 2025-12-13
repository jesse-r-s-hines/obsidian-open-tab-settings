import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test newTabPlacement', function() {
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({
            openInNewTab: false, deduplicateTabs: false,
            newTabPlacement: "after-active", newTabTabGroupPlacement: "same",
        });
        await workspacePage.setConfig('focusNewTab', false);
    })

    it('basic newTabPlacement end 1 tab', async function() {
        await workspacePage.setSettings({newTabPlacement: "end"});

        await workspacePage.openFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "markdown", file: "B.md"},
        ]]);
    })

    it('basic newTabPlacement end 2 tabs', async function() {
        await workspacePage.setSettings({newTabPlacement: "end"});

        await workspacePage.openFile("A.md");
        await workspacePage.openFile("D.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "markdown", file: "D.md"},
            {type: "markdown", file: "B.md"},
        ]]);
    })

    it('basic newTabPlacement beginning', async function() {
        await workspacePage.setSettings({newTabPlacement: "beginning"});

        await workspacePage.openFile("A.md");
        await workspacePage.openFile("D.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md"},
            {type: "markdown", file: "A.md", active: true},
            {type: "markdown", file: "D.md"},
        ]]);
    })

    it('basic newTabPlacement after-pinned [unpinned]-unpinned', async function() {
        await workspacePage.setSettings({newTabPlacement: "after-pinned"});

        await workspacePage.openFile("A.md");
        await workspacePage.openFile("D.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "markdown", file: "B.md"},
            {type: "markdown", file: "D.md"},
        ]]);
    })

    it('basic newTabPlacement after-pinned [unpinned]-pinned', async function() {
        await workspacePage.setSettings({newTabPlacement: "after-pinned"});

        await workspacePage.openFile("A.md");
        await workspacePage.openFile("D.md");
        await workspacePage.pinTab("D.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true, pinned: false},
            {type: "markdown", file: "D.md", pinned: true},
            {type: "markdown", file: "B.md", pinned: false},
        ]]);
    })

    it('basic newTabPlacement after-pinned [pinned]-unpinned', async function() {
        await workspacePage.setSettings({newTabPlacement: "after-pinned"});

        await workspacePage.openFile("A.md");
        await workspacePage.pinTab("A.md");
        await workspacePage.openFile("D.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true, pinned: true},
            {type: "markdown", file: "B.md", pinned: false},
            {type: "markdown", file: "D.md", pinned: false},
        ]]);
    })

    it('basic newTabPlacement after-pinned [pinned]-pinned', async function() {
        await workspacePage.setSettings({newTabPlacement: "after-pinned"});

        await workspacePage.openFile("A.md");
        await workspacePage.pinTab("A.md");
        await workspacePage.openFile("D.md");
        await workspacePage.pinTab("D.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true, pinned: true},
            {type: "markdown", file: "D.md", pinned: true},
            {type: "markdown", file: "B.md", pinned: false},
        ]]);
    })

    it('basic newTabPlacement after-pinned [pinned]-pinned-unpinned', async function() {
        await workspacePage.setSettings({newTabPlacement: "after-pinned"});

        await workspacePage.openFile("A.md");
        await workspacePage.pinTab("A.md");
        await workspacePage.openFile("D.md");
        await workspacePage.pinTab("D.md");
        await workspacePage.openFile("Loop.md");
        await workspacePage.setActiveFile("A.md");

        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true, pinned: true},
            {type: "markdown", file: "D.md", pinned: true},
            {type: "markdown", file: "B.md", pinned: false},
            {type: "markdown", file: "Loop.md", pinned: false},
        ]]);
    })

    it('replaces active empty', async function() {
        await workspacePage.setSettings({newTabPlacement: "end"});

        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.openFile("A.md");
        await workspacePage.setActiveFile((await workspacePage.getAllLeaves())[0][0].id);

        await workspacePage.matchWorkspace([[
            {type: "empty", active: true},
            {type: "markdown", file: "A.md"},
        ]]);

        await workspacePage.setSettings({openInNewTab: true});
        await workspacePage.openFileViaQuickSwitcher("B.md");

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md", active: true},
            {type: "markdown", file: "A.md"},
        ]]);
    })

    it('replaces next tab empty tab', async function() {
        await workspacePage.setSettings({newTabPlacement: "after-active"});

        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        // openFile will replace empty tab if its active, so call new-tab twice
        await browser.executeObsidianCommand("workspace:new-tab"); 
        await workspacePage.openFile("Loop.md");
        await workspacePage.setActiveFile("A.md");

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "empty"},
            {type: "markdown", file: "Loop.md"},
        ]]);

        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "markdown", file: "B.md"},
            {type: "markdown", file: "Loop.md"},
        ]]);
    })

    it('replaces end empty tab', async function() {
        await workspacePage.setSettings({newTabPlacement: "end"});

        await workspacePage.openFile("A.md");
        await workspacePage.openFile("Loop.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.setActiveFile("A.md");

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "markdown", file: "Loop.md"},
            {type: "empty"},
        ]]);

        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "markdown", file: "Loop.md"},
            {type: "markdown", file: "B.md"},
        ]]);
    })

    it("end doesn't replace middle empty tab", async function() {
        await workspacePage.setSettings({newTabPlacement: "end"});

        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        // openFile will replace empty tab if its active, so call new-tab twice
        await browser.executeObsidianCommand("workspace:new-tab"); 
        await workspacePage.openFile("Loop.md");
        await workspacePage.setActiveFile("A.md");

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "empty"},
            {type: "markdown", file: "Loop.md"},
        ]]);

        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "empty"},
            {type: "markdown", file: "Loop.md"},
            {type: "markdown", file: "B.md"},
        ]]);
    })

    it("newTabPlacement pinned tabs", async function() {
        await workspacePage.setSettings({ newTabPlacement: "beginning" });
        await workspacePage.openFile("A.md");
        await workspacePage.pinTab("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {file: "B.md", pinned: false, active: true},
            {file: "A.md", pinned: true},
        ]]);
    })

    it("Test newTabPlacement beginning focusNewTab false", async function() {
        await workspacePage.setSettings({ openInNewTab: true, newTabPlacement: "beginning" });
        await workspacePage.setConfig('focusNewTab', false);
        await workspacePage.openFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {file: "B.md"},
            {file: "A.md", active: true},
        ]]);

        // Verify that the active leaf is actually in view
        // might make sense to put this in matchWorkspace to check all the time, though that runs into some
        // complications with multiple windows.
        const activeLeaf = $(await browser.executeObsidian(({app, obsidian}) =>
            app.workspace.getActiveViewOfType(obsidian.View)!.containerEl
        ));
        await expect(activeLeaf).toBeDisplayed();
    })
})


describe('Test newTabTabGroupPlacement', function() {
    let mainWindow: string|undefined

    before(async function() {
        mainWindow = await browser.getWindowHandle();
        if ((await obsidianPage.getPlatform()).isPhone) this.skip();
    })

    after(async function() {
        await browser.switchToWindow(mainWindow!);
    })

    beforeEach(async function() {
        await browser.switchToWindow(mainWindow!);
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({
            openInNewTab: false, deduplicateTabs: false,
            newTabPlacement: "after-active", newTabTabGroupPlacement: "opposite",
        });
        await workspacePage.setConfig('focusNewTab', false);
    })

    it("newTabTabGroupPlacement basic", async function() {
        // A is in left, Loop is in right
        await workspacePage.loadPlatformWorkspaceLayout("split")
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md", active: true}],
            [{type: "markdown", file: "Loop.md"}, {type: "markdown", file: "B.md"}],
        ]);
    })

    it("newTabTabGroupPlacement replace empty", async function() {
        // A is in left, Loop is in right
        await workspacePage.loadPlatformWorkspaceLayout("split")
        await workspacePage.setActiveFile("Loop.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.setActiveFile("Loop.md");
        await browser.executeObsidianCommand("workspace:close");
        await workspacePage.setActiveFile("A.md");

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md", active: true}],
            [{type: "empty"}],
        ]);

        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md", active: true}],
            [{type: "markdown", file: "B.md"}],
        ]);
    })


    it("newTabTabGroupPlacement nested split", async function() {
        // A is in left, Loop in top right, D in bottom right
        await workspacePage.loadPlatformWorkspaceLayout("nested-split")
        await workspacePage.setActiveFile("A.md");

        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md", active: true}],
            [{type: "markdown", file: "Loop.md"}],
            [{type: "markdown", file: "D.md"}, {type: "markdown", file: "B.md"}],
        ]);
    })

     it("newTabTabGroupPlacement doesn't open in separate windows", async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();
        // A in main, D in a popout window
        await workspacePage.loadPlatformWorkspaceLayout("popout-window");
        await browser.pause(250);
        await workspacePage.setActiveFile("A.md");

        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{file: "A.md", active: true}, {file: "B.md"}],
            [{file: "D.md"}],
        ]);
    })

    it("newTabTabGroupPlacement in secondary window", async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();
        // A in main, D and Loop in a popout window
        await workspacePage.loadPlatformWorkspaceLayout("split-popout-window");
        await browser.pause(250);

        const otherWindow = (await browser.getWindowHandles()).find(h => h != mainWindow)!;
        await browser.switchToWindow(otherWindow);

        await workspacePage.setActiveFile("D.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop"));

        await workspacePage.matchWorkspace([
            [{file: "A.md"}],
            [{file: "D.md", active: true}],
            [{file: "Loop.md"}, {file: "Loop.md"}],
        ]);
    })

    it("newTabTabGroupPlacement deduplicate doesn't delete panel", async function() {
        await workspacePage.setSettings({ deduplicateTabs: true });
        // A is in left, Loop is in right
        await workspacePage.loadPlatformWorkspaceLayout("split")
        await workspacePage.setActiveFile("Loop.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.setActiveFile("Loop.md");
        await browser.executeObsidianCommand("workspace:close");

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [{type: "empty", active: true}],
        ]);

        await workspacePage.openFileViaFileExplorer("A.md");

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md", active: true}],
            [{type: "empty"}],
        ]);
    })

    it("newTabTabGroupPlacement first from first", async function() {
        await workspacePage.setSettings({ newTabTabGroupPlacement: "first" });
        // A is in left, Loop is in right
        await workspacePage.loadPlatformWorkspaceLayout("nested-split")
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{file: "A.md"}, {file: "B.md"}],
            [{file: "Loop.md"}],
            [{file: "D.md"}],
        ]);
    })

    it("newTabTabGroupPlacement first from last", async function() {
        await workspacePage.setSettings({ newTabTabGroupPlacement: "first" });
        // A is in left, Loop is in right
        await workspacePage.loadPlatformWorkspaceLayout("nested-split")
        await workspacePage.setActiveFile("D.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop"));

        await workspacePage.matchWorkspace([
            [{file: "A.md"}, {file: "Loop.md"}],
            [{file: "Loop.md"}],
            [{file: "D.md"}],
        ]);
    })

    it("newTabTabGroupPlacement last from last", async function() {
        await workspacePage.setSettings({ newTabTabGroupPlacement: "last" });
        // A is in left, Loop is in right
        await workspacePage.loadPlatformWorkspaceLayout("nested-split")
        await workspacePage.setActiveFile("D.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop"));

        await workspacePage.matchWorkspace([
            [{file: "A.md"}],
            [{file: "Loop.md"}],
            [{file: "D.md"}, {file: "Loop.md"}],
        ]);
    })

    it("newTabTabGroupPlacement last from first", async function() {
        await workspacePage.setSettings({ newTabTabGroupPlacement: "last" });
        // A is in left, Loop is in right
        await workspacePage.loadPlatformWorkspaceLayout("nested-split")
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{file: "A.md"}],
            [{file: "Loop.md"}],
            [{file: "D.md"}, {file: "B.md"}],
        ]);
    })
})
