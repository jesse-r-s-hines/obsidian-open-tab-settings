import { browser } from '@wdio/globals'
import { expect } from 'chai';
import workspacePage from 'test/pageobjects/workspace.page';
import { setSettings } from './helpers';


describe('Test my plugin', () => {
    it('basic test', async () => {
        await setSettings({ openInNewTab: true });
        await workspacePage.openFile("A.md");
        (await workspacePage.getLink("B")).click()
        await browser.waitUntil(() => browser.execute(() => {
            let result = false;
            optl.app.workspace.iterateRootLeaves(l => {
                if (l.view instanceof optl.obsidian.MarkdownView && l.view.file?.path == "B.md") {
                    result = true
                }
            })
            return result;
        }))
        const open = await workspacePage.getAllLeaves()
        expect(open).to.eql([["markdown", "A.md"], ["markdown", "B.md"]])
        const active = await workspacePage.getActiveLeaf()
        expect(active).to.eql(["markdown", "B.md"])
    })
})
