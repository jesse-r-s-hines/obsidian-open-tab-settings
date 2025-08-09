import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';

describe('Misc', function() {
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true, openInSameTabOnModClick: true });
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
        });
        expect(value).toEqual(true);
    });
})

describe("Mod click", function() {
    before(async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();
    })
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true, openInSameTabOnModClick: true });
    });

    it('Test mod click', async function() {
        await workspacePage.setSettings({ openInSameTabOnModClick: true });
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md", active: true},
        ]]);
    });

    it('Test mod click off', async function() {
        await workspacePage.setSettings({ openInSameTabOnModClick: false });
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "B.md", active: true},
        ]]);
    });

    it('Test mod click no new tab', async function() {
        await workspacePage.setSettings({ openInNewTab: false, openInSameTabOnModClick: true });
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "B.md", active: true},
        ]]);
    });

    it('Test mod new tab disabled', async function() {
        await workspacePage.setSettings({ openInNewTab: false, openInSameTabOnModClick: true });
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md"},
        ]]);
    });
})
