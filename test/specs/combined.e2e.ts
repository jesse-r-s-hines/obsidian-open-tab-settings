import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';

describe('Test basic deduplicate', function() {
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', true);
    });

    it('basic dedup', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('basic new tab', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('self link', async function() {
        await workspacePage.openFile("Loop.md");
        await workspacePage.openLink(await workspacePage.getLink("Loop.md"));
        await browser.pause(250);
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "Loop.md", active: true},
        ]]);
    })

    it('dedup across splits with multiple tabs', async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();

        // Test that switching to duplicate tab doesn't change active tab
        // See https://github.com/jesse-r-s-hines/obsidian-open-tab-settings/issues/56

        await workspacePage.loadPlatformWorkspaceLayout("split-multi-tab");
        // [[D.md (active), A.md], [Loop.md]]

        await workspacePage.openLink(await workspacePage.getLink("Loop"));

        await workspacePage.matchWorkspace([
            [{file: "D.md", currentTab: true}, {file: "A.md", currentTab: false}],
            [{file: "Loop.md", active: true, currentTab: true}],
        ]);
    })

    it('internal link with multiple duplicates', async function() {
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });
        await workspacePage.openFile("Loop.md");
        await workspacePage.openFile("Loop.md");
        const [loop1, loop2] = (await workspacePage.getAllLeaves())[0];

        await workspacePage.setActiveFile(loop2.id);
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "Loop.md", id: loop1.id},
            {type: "markdown", file: "Loop.md", id: loop2.id, active: true},
        ]]);

        await workspacePage.openLink(await workspacePage.getLink("Loop.md#Subheading"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "Loop.md", id: loop1.id},
            {type: "markdown", file: "Loop.md", id: loop2.id, active: true},
        ]]);
    })
})
