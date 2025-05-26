import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test deduplicate for splits and more', function() {
    beforeEach(async function() {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: false, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', true);
    });

    it('open to the right', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkToRight(await workspacePage.getLink("B"));

        // Should create a new tab despite deduplicate
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md"}],
            [{type: "markdown", file: "B.md", active: true}],
        ]);
    })

    it('open in popout window', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        const b1 = await workspacePage.getActiveLeaf();
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewWindow(await workspacePage.getLink("B"));

        // Should create a new tab despite deduplicate
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md"}],
            [{type: "markdown", file: "B.md", active: true}],
        ]);

        const b2 = await workspacePage.getActiveLeaf();
        expect(b1.container).not.toEqual(b2.container);
    })

    it('dedup across panes', async function() {
        // A and Loop split left/right
        await obsidianPage.loadWorkspaceLayout("split");
        await workspacePage.setActiveFile("Loop.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[{file: "A.md"}], [{file: "B.md", active: true}]]);

        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [{type: "markdown", file: "B.md", active: true}],
        ]);
    })

    it('dedup across windows', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await browser.executeObsidianCommand('workspace:move-to-new-window');
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [{type: "markdown", file: "B.md", active: true}],
        ]);

        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [{type: "markdown", file: "B.md", active: true}],
        ]);
    })

    it('outlinks', async function() {
        // Make sure outlinks don't get picked up as a file
        await obsidianPage.loadWorkspaceLayout("outgoing-links");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md"}],
            [{type: "outgoing-link", file: "B.md"}],
            [{type: "markdown", file: "B.md", active: true}],
        ]);
    })

    it('linked file', async function() {
        await obsidianPage.loadWorkspaceLayout("outgoing-links");
        await browser.$('.outgoing-link-pane').click()
        await browser.waitUntil(async () => (await workspacePage.getActiveLeaf()).type == "outgoing-link");
        await browser.$('.outgoing-link-pane').$("div=A").click();
        await workspacePage.matchWorkspace([
            [{type: "markdown", file: "A.md", active: true}],
            [{type: "outgoing-link", file: "B.md"}],
            [{type: "markdown", file: "B.md"}],
        ]);
    })

    it('deferred views', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await browser.reloadObsidian();

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", deferred: false, active: true},
            {type: "markdown", file: "B.md", deferred: true},
        ]]);

        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", deferred: false},
            {type: "markdown", file: "B.md", deferred: false, active: true},
        ]]);
    })

    it("back buttons", async function() {
        await workspacePage.setSettings({ deduplicateTabs: false });
        await workspacePage.openFile("B.md");
        await workspacePage.openFile("B.md");
        await workspacePage.openLink(await workspacePage.getLink("A"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md"}, {type: "markdown", file: "A.md", active: true},
        ]]);
        await workspacePage.setSettings({ deduplicateTabs: true });

        // Still opens in the same tab
        // TODO: Should we override go-back behavior as well?
        await browser.executeObsidianCommand("app:go-back");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);

        await browser.executeObsidianCommand("app:go-forward");
                await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md"}, {type: "markdown", file: "A.md", active: true},
        ]]);
    })

    it('stacked tabs', async function() {
        await obsidianPage.loadWorkspaceLayout("stacked");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })
})
