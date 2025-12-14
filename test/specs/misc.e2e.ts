import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';

describe('Misc', function() {
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
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
        });
        expect(value).toEqual(true);
    });

    it("opposite menu item", async function() {
        await workspacePage.setSettings({
            openInNewTab: true, deduplicateTabs: false, newTabTabGroupPlacement: "same",
        });

        await workspacePage.openFile("A.md");
        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));
        await workspacePage.setActiveFile("A.md");

        await workspacePage.openLinkMenuOption(await workspacePage.getLink("B"), "Open in opposite tab group");
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [{type: "markdown", file: "B.md"}, {type: "markdown", file: "B.md"}]
        ]);
    })
})

describe("Mod click", function() {
    before(async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();
    })
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });
    });

    it('Test mod click same', async function() {
        await workspacePage.setSettings({ modClickBehavior: "same" });
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md", active: true},
        ]]);
    });

    it('Test mod click off', async function() {
        await workspacePage.setSettings({ modClickBehavior: "tab" });
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "B.md", active: true},
        ]]);
    });

    it('Test mod click duplicate', async function() {
        await workspacePage.setSettings({ deduplicateTabs: true, modClickBehavior: "allow_duplicate" });

        await workspacePage.openFile("B.md");
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md"},
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "B.md", active: true},
        ]]);
    });

    it("mode click opposite", async function() {
        await workspacePage.setSettings({
            openInNewTab: true, deduplicateTabs: false, newTabTabGroupPlacement: "opposite",
        });

        await workspacePage.openFile("A.md");
        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));
        await workspacePage.setActiveFile("A.md");

        await (await workspacePage.getLink("B")).click({"button": "middle"});
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [{type: "markdown", file: "B.md"}, {type: "markdown", file: "B.md"}]
        ]);
    })
})
