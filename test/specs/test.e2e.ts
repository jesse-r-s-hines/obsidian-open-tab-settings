import { browser } from '@wdio/globals'
import { expect } from 'chai';

describe('Test my plugin', () => {
    before(async () => {
        await browser.openVault("./test/vaults/simple");
    })
    it('test command open-sample-modal-simple', async () => {
        await browser.executeObsidianCommand("sample-plugin:open-sample-modal-simple");

        expect(await browser.$(".modal-container .modal-content").isExisting()).to.equal(true);
        expect(await browser.$(".modal-container .modal-content").getText()).to.equal("Woah!");
    })
})
