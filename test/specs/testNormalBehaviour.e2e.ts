import { browser } from '@wdio/globals'
import { Key } from 'webdriverio'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { setSettings } from './helpers';

// Test that normal behaviors aren't broken by the plugin
// We'll run these tests 3 times: with the plugin disabled, with the settings disabled, and with the settings enabled

const tests = () => {
    beforeEach(async () => {
        await workspacePage.loadWorkspaceLayout("empty");
        await workspacePage.setConfig('focusNewTab', true);
    });

    it('Open first file via open modal works', async () => {
        await workspacePage.openFileViaModal("A.md");
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "A.md"])
    })

    it("Open first file via file explorer works", async () => {
        expect(await workspacePage.getAllLeaves()).to.eql([['empty', '']]); // Make sure loadWorkspaceLayout is working
        
        await workspacePage.openFileViaModal("A.md");
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "A.md"])
    })

    it("new tab still works", async () => {
        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        expect(await workspacePage.getAllLeaves()).to.eql([["empty", ""], ["markdown", "A.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["empty", ""])
    })

    it("empty tabs still get replaced", async () => {
        await workspacePage.openFile("A.md")
        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.openFileViaModal("B.md");
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
    })

    it("Explicit open in new tab still works when focusNewTab is false", async () => {
        await workspacePage.setConfig('focusNewTab', false);

        await workspacePage.openFile("A.md");
        (await workspacePage.getLink("B")).click({button: "middle"});
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        const active = await workspacePage.getActiveLeaf()
        expect(active).to.eql(["markdown", "A.md"])
    })

    it("Explicit open in new tab still works when focusNewTab is true", async () => {
        await workspacePage.setConfig('focusNewTab', true);

        await workspacePage.openFile("A.md");
        (await workspacePage.getLink("B")).click({button: "middle"});
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        const active = await workspacePage.getActiveLeaf()
        expect(active).to.eql(["markdown", "B.md"])
    })
}


describe('Test normal behavior without the plugin', () => {
    before(async () => {
        await browser.disablePlugin("sample-plugin");
    });

    after(async () => {
        await browser.enablePlugin("sample-plugin");
    });

    tests();
})

describe('Test normal behavior with the plugin settings turned off', () => {
    before(async () => {
        await setSettings({ openInNewTab: false });;
    })

    tests();
})

describe('Test normal behavior with the plugin settings enabled', () => {
    before(async () => {
        await setSettings({ openInNewTab: true });;
    });

    tests();
})