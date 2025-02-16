import { browser } from '@wdio/globals'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { setSettings } from './helpers';

// Test that normal behaviors aren't broken by the plugin
describe('Test normal behavior', () => {
    beforeEach(async () => {
        await setSettings({ openInNewTab: true });
        await workspacePage.loadWorkspaceLayout("empty");
    })

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
})
