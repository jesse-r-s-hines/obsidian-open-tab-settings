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
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [["markdown", "A.md"]]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
    })

    it("Open first file via file explorer works", async function() {
        expect(await workspacePage.getAllLeaves()).toEqual([['empty', '']]); // Make sure loadWorkspaceLayout is working
        
        await workspacePage.openFileViaModal("A.md");
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [["markdown", "A.md"]]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
    })

    it("new tab still works", async function() {
        await obsidianPage.openFile("A.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        expect(await workspacePage.getAllLeaves()).toEqual([["empty", ""], ["markdown", "A.md"]])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["empty", ""]);
    })

    it("empty tabs still get replaced", async function() {
        await obsidianPage.openFile("A.md")
        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.openFileViaModal("B.md");
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it("new file still works", async function() {
        await obsidianPage.openFile("A.md");
        await browser.executeObsidianCommand("file-explorer:new-file");
        // new file normally opens in new tab
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "Untitled.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "Untitled.md"]);
    })

    it("Explicit open in new tab still works when focusNewTab is false", async function() {
        await workspacePage.setConfig('focusNewTab', false);

        await obsidianPage.openFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "A.md"]);
    })

    it("Explicit open in new tab still works when focusNewTab is true", async function() {
        await workspacePage.setConfig('focusNewTab', true);

        await obsidianPage.openFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })

    it("Explicit open in new tab to the right still works", async function() {
        await obsidianPage.openFile("A.md");
        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
        const aParent = await workspacePage.getLeafParent("A.md");
        const bParent = await workspacePage.getLeafParent("B.md");
        expect(aParent).not.toEqual(bParent);
    })

    it("Explicit open in new window still works", async function() {
        await obsidianPage.openFile("A.md");
        await workspacePage.openLinkInNewWindow(await workspacePage.getLink("B"));
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ]);
        const aParent = await workspacePage.getLeafRoot("A.md");
        const bParent = await workspacePage.getLeafRoot("B.md");
        expect(!!(aParent && bParent)).toEqual(true)
        expect(aParent).not.toEqual(bParent);
    })

    it("pinned file", async function() {
        await obsidianPage.openFile("A.md");
        await workspacePage.setActiveFile("A.md")
        await browser.executeObsidianCommand("workspace:toggle-pin");

        await (await workspacePage.getLink("B")).click();
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"],
        ])
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
    })
}

const noDedupTests = () => {
    it("open self link in new tab focusNewTab true", async function() {
        await workspacePage.setConfig('focusNewTab', true);

        await obsidianPage.openFile("Loop.md");
        const prevActiveLeaf = await workspacePage.getActiveLeafId();
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop.md"));
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "Loop.md"], ["markdown", "Loop.md"],
        ]);
        expect(await workspacePage.getActiveLeafId()).not.toEqual(prevActiveLeaf);
    })

    it("open self link in new tab focusNewTab false", async function() {
        await workspacePage.setConfig('focusNewTab', false);

        await obsidianPage.openFile("Loop.md");
        const prevActiveLeaf = await workspacePage.getActiveLeafId();
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop.md"));
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "Loop.md"], ["markdown", "Loop.md"],
        ]);
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeafId(), prevActiveLeaf);
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
