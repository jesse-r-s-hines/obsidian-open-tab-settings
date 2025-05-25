import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from "wdio-obsidian-service"

// Test that normal behaviors aren't broken by the plugin
// We'll run these tests 3 times: with the plugin disabled, with the settings disabled, and with the settings enabled

const tests = () => {
    beforeEach(async function() {
        await obsidianPage.resetVault();
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setConfig('focusNewTab', true);
    });

    it('Open first file via open modal works', async function() {
        await workspacePage.openFileViaModal("A.md");
        await workspacePage.matchWorkspace([[{type: "markdown", file: "A.md", active: true}]]);
    })

    it("Open first file via file explorer works", async function() {
        await workspacePage.matchWorkspace([[{type: "empty"}]]); // Make sure loadWorkspaceLayout is working
        await workspacePage.openFileViaModal("A.md");
        await workspacePage.matchWorkspace([[{type: "markdown", file: "A.md", active: true}]]);
    })

    it("new tab still works", async function() {
        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "empty", active: true},
        ]]);
    })

    it("empty tabs still get replaced", async function() {
        await workspacePage.openFile("A.md")
        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.openFileViaModal("B.md");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it("new file still works", async function() {
        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("file-explorer:new-file");
        // new file normally opens in new tab
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "Untitled.md", active: true},
        ]]);
    })

    it("Explicit open in new tab still works when focusNewTab is false", async function() {
        await workspacePage.setConfig('focusNewTab', false);

        await workspacePage.openFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true}, {type: "markdown", file: "B.md"},
        ]]);
    })

    it("Explicit open in new tab still works when focusNewTab is true", async function() {
        await workspacePage.setConfig('focusNewTab', true);

        await workspacePage.openFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it("Explicit open in new tab to the right still works", async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [{type: "markdown", file: "B.md"}],
        ]);
    })

    it("Explicit open in new window still works", async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLinkInNewWindow(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [{type: "markdown", file: "B.md"}],
        ]);
        const aRoot = (await workspacePage.getLeaf("A.md")).root;
        const bRoot = (await workspacePage.getLeaf("B.md")).root;
        expect(aRoot).not.toEqual(bRoot);
    })

    it("pinned file", async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.setActiveFile("A.md")
        await workspacePage.pinTab("A.md");

        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })
}

const noDedupTests = () => {
    it("open self link in new tab focusNewTab true", async function() {
        await workspacePage.setConfig('focusNewTab', true);

        await workspacePage.openFile("Loop.md");
        const prevActiveLeaf = await workspacePage.getActiveLeaf();
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop.md"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "Loop.md"}, {type: "markdown", file: "Loop.md", active: true},
        ]]);
        expect((await workspacePage.getActiveLeaf()).id).not.toEqual(prevActiveLeaf.id);
    })

    it("open self link in new tab focusNewTab false", async function() {
        await workspacePage.setConfig('focusNewTab', false);

        await workspacePage.openFile("Loop.md");
        const prevActiveLeaf = await workspacePage.getActiveLeaf();
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop.md"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "Loop.md", active: true}, {type: "markdown", file: "Loop.md"},
        ]]);
        expect((await workspacePage.getActiveLeaf()).id).toEqual(prevActiveLeaf.id);
    })
}

describe("Test normal behavior", function() {
    describe('without the plugin', function() {
        before(async function() {
            await obsidianPage.disablePlugin("open-tab-settings");
            await workspacePage.setConfig('focusNewTab', true);
        });

        after(async function() {
            await obsidianPage.enablePlugin("open-tab-settings");
        });

        tests();
        noDedupTests();
    })

    describe('with the plugin settings turned off', function() {
        beforeEach(async function() {
            await workspacePage.setSettings({ openInNewTab: false, deduplicateTabs: false });
            await workspacePage.setConfig('focusNewTab', true);
        })

        tests();
        noDedupTests();
    })

    describe('with openInNewTab turned off', function() {
        beforeEach(async function() {
            await workspacePage.setSettings({ openInNewTab: false, deduplicateTabs: true });
            await workspacePage.setConfig('focusNewTab', true);
        })

        tests();
    })

    describe('with deduplicateTabs turned off', function() {
        beforeEach(async function() {
            await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: false });
            await workspacePage.setConfig('focusNewTab', true);
        })

        tests();
        noDedupTests();
    })

    describe('with the plugin settings enabled', function() {
        beforeEach(async function() {
            await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });
            await workspacePage.setConfig('focusNewTab', true);
        });

        tests();
    })
})
