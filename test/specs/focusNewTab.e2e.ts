import { browser } from '@wdio/globals'
import { obsidianPage } from 'wdio-obsidian-service';

describe('Test Focus New Tab', function() {
    this.beforeEach(async function() {
        await obsidianPage.loadWorkspaceLayout("empty");
    });

    it('should update focusNewTab on boot', async function() {
        const focusNewTab = await browser.executeObsidian(({app}) => app.vault.getConfig('focusNewTab'));
        expect(focusNewTab).toEqual(false);
        await browser.executeObsidian(({app}) => app.vault.setConfig("focusNewTab", true));
        // doesn't change it on a reboot.
        await browser.reloadObsidian();

        const focusNewTabAfter = await browser.executeObsidian(({app}) => app.vault.getConfig('focusNewTab'));
        expect(focusNewTabAfter).toEqual(true);
    });

    // focusNewTab interaction is tested more in the other specs
})
