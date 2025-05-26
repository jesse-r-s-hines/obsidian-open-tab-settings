import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { sleep } from '../helpers';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test new tab placement', function() {
    beforeEach(async function() {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({
            openInNewTab: false, deduplicateTabs: false,
            newTabPlacement: "after-active", openNewTabsInOtherTabGroup: true,
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
            {type: "markdown", file: "B.md", pinned: false},
            {type: "markdown", file: "D.md", pinned: true},
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
        await workspacePage.openFileViaModal("B.md");

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

    it("openNewTabsInOtherTabGroup basic", async function() {
        // A is in left, Loop is in right
        await obsidianPage.loadWorkspaceLayout("split")
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md", active: true}],
            [{type: "markdown", file: "Loop.md"}, {type: "markdown", file: "B.md"}],
        ]);
    })

    it("openNewTabsInOtherTabGroup replace empty", async function() {
        // A is in left, Loop is in right
        await obsidianPage.loadWorkspaceLayout("split")
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


    it("openNewTabsInOtherTabGroup nested split", async function() {
        // A is in left, Loop in top right, D in bottom right
        await obsidianPage.loadWorkspaceLayout("nested-split")
        await workspacePage.setActiveFile("A.md");

        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md", active: true}],
            [{type: "markdown", file: "Loop.md"}],
            [{type: "markdown", file: "D.md"}, {type: "markdown", file: "B.md"}],
        ]);
    })

     it("openNewTabsInOtherTabGroup doesn't open in separate windows", async function() {
        // A in main, D in a popout window
        await obsidianPage.loadWorkspaceLayout("popout-window");
        await sleep(250);
        await workspacePage.setActiveFile("A.md");

        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{file: "A.md", active: true}, {file: "B.md"}],
            [{file: "D.md"}],
        ]);
    })

    it("openNewTabsInOtherTabGroup in secondary window", async function() {
        // A in main, D and Loop in a popout window
        await obsidianPage.loadWorkspaceLayout("split-popout-window");
        await sleep(250);

        const mainWindow = await browser.getWindowHandle();
        const otherWindow = (await browser.getWindowHandles()).find(h => h != mainWindow)!;
        await browser.switchToWindow(otherWindow);

        await workspacePage.setActiveFile("D.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop"));

        await workspacePage.matchWorkspace([
            [{file: "A.md"}],
            [{file: "D.md", active: true}],
            [{file: "Loop.md"}, {file: "Loop.md"}],
        ]);

        await browser.switchToWindow(mainWindow);
    })
})
