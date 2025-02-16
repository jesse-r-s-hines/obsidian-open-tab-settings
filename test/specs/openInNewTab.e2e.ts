import { browser } from '@wdio/globals'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { setSettings } from './helpers';


describe('Test my plugin', () => {
    it('basic test', async () => {
        await setSettings({ openInNewTab: true });
        await workspacePage.openFile("A.md");
        (await workspacePage.getLink("B")).click()

        await browser.waitUntil(async () => (await workspacePage.getAllLeaves()).length >= 2)
        expect(await workspacePage.getAllLeaves()).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        expect(await workspacePage.getActiveLeaf()).to.eql(["markdown", "B.md"])
    })
})
