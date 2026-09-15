import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';

describe('Misc', function() {
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });
    });

    // it('should update focusNewTab on boot', async function() {
    //     const focusNewTab = await browser.executeObsidian(({app}) => app.vault.getConfig('focusNewTab'));
    //     expect(focusNewTab).toEqual(false);
    //     await workspacePage.setConfig("focusNewTab", true);
    //     // doesn't change it on a reboot.
    //     await browser.reloadObsidian();

    //     const focusNewTabAfter = await browser.executeObsidian(({app}) => app.vault.getConfig('focusNewTab'));
    //     expect(focusNewTabAfter).toEqual(true);
    // });

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

    it('getUnpinnedLeaf active', async function() {
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.matchWorkspace([[{file: "A.md"}, {file: "B.md", active: true}]]);

        await browser.executeObsidian(async ({app}) => {
            await app.workspace.getUnpinnedLeaf().openFile(app.vault.getFileByPath("A.md")!);
        })

        await workspacePage.matchWorkspace([[{file: "A.md", active: true}, {file: "B.md"}]]);
    })

    // it('commands', async function() {
    //     await workspacePage.setSettings({ openInNewTab: false });
    //     await browser.executeObsidianCommand("open-tab-settings:toggle-open-in-new-tab");
    //     const value = await browser.executeObsidian(async ({plugins}) => {
    //         return plugins.openTabSettings.settings.openInNewTab;
    //     });
    //     expect(value).toEqual(true);
    // });

    // it("opposite menu item", async function() {
    //     if ((await obsidianPage.getPlatform()).isMobile) this.skip();
    //     await workspacePage.setSettings({
    //         openInNewTab: true, deduplicateTabs: false, newTabTabGroupPlacement: "same",
    //     });

    //     await workspacePage.openFile("A.md");
    //     await workspacePage.openLinkToRight(await workspacePage.getLink("B"));
    //     await workspacePage.setActiveFile("A.md");

    //     await workspacePage.openLinkMenuOption(await workspacePage.getLink("B"), "Open in opposite tab group");
    //     await workspacePage.matchWorkspace([
    //         [{type: "markdown", file: "A.md"}],
    //         [{type: "markdown", file: "B.md"}, {type: "markdown", file: "B.md"}]
    //     ]);
    // })

    // it("new tab command afterActive", async function() {
    //     await workspacePage.setSettings({openInNewTab: false});
    //     await workspacePage.openFile("A.md");
    //     await workspacePage.openFile("B.md");
    //     await workspacePage.setActiveFile("A.md");

    //     await browser.executeObsidianCommand("open-tab-settings:new-tab-after-active")
    //     await workspacePage.matchWorkspace([
    //         [{file: "A.md"}, {type: "empty", active: true}, {file: "B.md"}],
    //     ]);
    // })

    // it("new tab command beginning", async function() {
    //     await workspacePage.openFile("A.md");
    //     await workspacePage.openFile("B.md");
    //     await workspacePage.setActiveFile("A.md");

    //     await browser.executeObsidianCommand("open-tab-settings:new-tab-beginning")
    //     await workspacePage.matchWorkspace([
    //         [{type: "empty", active: true}, {file: "A.md"}, {file: "B.md"}],
    //     ]);
    // })

    // it("new tab command doesn't replace empty", async function() {
    //     await workspacePage.openFile("A.md");
    //     await workspacePage.openFile("B.md");
    //     await workspacePage.setActiveFile("A.md");

    //     await browser.executeObsidianCommand("open-tab-settings:new-tab-beginning")
    //     await browser.executeObsidianCommand("open-tab-settings:new-tab-beginning")
    //     await workspacePage.matchWorkspace([
    //         [{type: "empty", active: true}, {type: "empty"}, {file: "A.md"}, {file: "B.md"}],
    //     ]);
    // })
})
