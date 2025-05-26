import workspacePage from 'test/pageobjects/workspace.page';
import { sleep } from '../helpers';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test basic deduplicate', function() {
    beforeEach(async function() {
        await obsidianPage.loadWorkspaceLayout("empty");
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
        await sleep(250);
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "Loop.md", active: true},
        ]]);
    })
})
