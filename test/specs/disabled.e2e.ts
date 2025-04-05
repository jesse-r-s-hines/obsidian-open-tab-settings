import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test disable options', () => {
    beforeEach(async () => {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setConfig('focusNewTab', false);
    });

    it("Test disable openInNewTab", async () => {
        await workspacePage.setSettings({ openInNewTab: false, deduplicateTabs: true });

        await obsidianPage.openFile("A.md");
        (await workspacePage.getLink("B")).click()

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "B.md"]])
    })

    it("Test disable deduplicateTabs", async () => {
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: false });

        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        await workspacePage.waitUntilEqual(() => workspacePage.getAllLeaves(), [
            ["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"],
        ])
    })
})

describe('Test disabling the plugin', () => {
    before(async () => {
        await obsidianPage.disablePlugin("open-tab-settings");
        await workspacePage.setConfig('focusNewTab', false);
    });

    beforeEach(async () => {
        await obsidianPage.loadWorkspaceLayout("empty");
    });


    after(async () => {
        await obsidianPage.enablePlugin("open-tab-settings");
    });

    it("Test disabling the plugin new tabs", async () => {
        await obsidianPage.openFile("A.md");
        (await workspacePage.getLink("B")).click()
        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "B.md"]]);
    })

    it("Test disable deduplicateTabs", async () => {
        await obsidianPage.openFile("A.md");
        await obsidianPage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "B.md"], ["markdown", "B.md"]])
    })
})

describe('Test bypass new tab', () => {
    beforeEach(async () => {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setConfig('focusNewTab', false);
    });

    it("Test bypass new tab", async () => {
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: false });

        await obsidianPage.openFile("A.md");
        await workspacePage.openLinkInSameTab(await workspacePage.getLink("B"))

        await workspacePage.waitUntilEqual(() => workspacePage.getActiveLeaf(), ["markdown", "B.md"]);
        expect(await workspacePage.getAllLeaves()).toEqual([["markdown", "B.md"]])
    })
})
