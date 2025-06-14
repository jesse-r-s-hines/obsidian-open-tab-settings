import { browser } from '@wdio/globals'
import { obsidianPage } from 'wdio-obsidian-service';
import workspacePage from 'test/pageobjects/workspace.page';

describe('Misc', function() {
    beforeEach(async function() {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });
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

    it('getUnpinnedLeaf openInNewTab true', async function() {
        await workspacePage.setSettings({ openInNewTab: true });
        await workspacePage.openFile("A.md");
        await browser.executeObsidian(async ({app}) => {
            await app.workspace.getUnpinnedLeaf().openFile(app.vault.getFileByPath("B.md")!);
        })

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true}],
        ]);
    });

    it('getUnpinnedLeaf openInNewTab false', async function() {
        await workspacePage.setSettings({ openInNewTab: false });
        await workspacePage.openFile("A.md");
        await browser.executeObsidian(async ({app}) => {
            await app.workspace.getUnpinnedLeaf().openFile(app.vault.getFileByPath("B.md")!);
        })

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "B.md", active: true}],
        ]);
    });

    it('commands', async function() {
        await workspacePage.setSettings({ openInNewTab: false });
        await browser.executeObsidianCommand("open-tab-settings:toggle-open-in-new-tab");
        const value = await browser.executeObsidian(async ({plugins}) => {
            return plugins.openTabSettings.settings.openInNewTab;
        })
        expect(value).toBe(true);
    });
})
