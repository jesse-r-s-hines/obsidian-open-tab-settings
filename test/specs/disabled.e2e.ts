import { browser } from '@wdio/globals'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { setSettings, sleep } from './helpers';


describe('Test disable options', () => {
    beforeEach(async () => {
        await workspacePage.loadWorkspaceLayout("empty");
        await workspacePage.setConfig('focusNewTab', false);
    });

    it("Test disable openInNewTab", async () => {
        await setSettings({ openInNewTab: false, deduplicateTabs: true });

        await workspacePage.openFile("A.md");
        (await workspacePage.getLink("B")).click()

        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md");
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "B.md"]])
    })

    it("Test disable deduplicateTabs", async () => {
        await setSettings({ openInNewTab: true, deduplicateTabs: false });

        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => 
            (await workspacePage.getAllLeaves()).length == 3 && (await workspacePage.getActiveLeaf())[1] == "B.md"
        )
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"], ["markdown", "B.md"]])
    })
})

describe('Test disabling the plugin', () => {
    before(async () => {
        await browser.disablePlugin("open-tab-settings");
        await workspacePage.setConfig('focusNewTab', false);
    });

    beforeEach(async () => {
        await workspacePage.loadWorkspaceLayout("empty");
    });


    after(async () => {
        await browser.enablePlugin("open-tab-settings");
    });

    it("Test disabling the plugin new tabs", async () => {
        await workspacePage.openFile("A.md");
        (await workspacePage.getLink("B")).click()
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md");
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "B.md"]]);
    })

    it("Test disable deduplicateTabs", async () => {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        (await workspacePage.getLink("B")).click();

        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md")
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "B.md"], ["markdown", "B.md"]])
    })
})

describe('Test bypass new tab', () => {
    beforeEach(async () => {
        await workspacePage.loadWorkspaceLayout("empty");
        await workspacePage.setConfig('focusNewTab', false);
    });

    it("Test bypass new tab", async () => {
        await setSettings({ openInNewTab: true, deduplicateTabs: false });

        await workspacePage.openFile("A.md");
        await workspacePage.openLinkInSameTab(await workspacePage.getLink("B"))

        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf())[1] == "B.md");
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "B.md"]])
    })
})
