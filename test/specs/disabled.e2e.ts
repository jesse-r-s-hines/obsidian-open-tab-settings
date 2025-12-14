import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test disable options', function() {
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setConfig('focusNewTab', false);
    });

    it("Test disable openInNewTab", async function() {
        await workspacePage.setSettings({ openInNewTab: false, deduplicateTabs: true });

        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"))

        await workspacePage.matchWorkspace([[{type: "markdown", file: "B.md", active: true}]]);
    })

    it("Test disable deduplicateTabs", async function() {
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: false });

        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
            {type: "markdown", file: "B.md"},
        ]]);
    })
})

describe('Test disabling the plugin', function() {
    before(async function() {
        await obsidianPage.disablePlugin("open-tab-settings");
        await workspacePage.setConfig('focusNewTab', false);
    });

    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
    });


    after(async function() {
        await obsidianPage.enablePlugin("open-tab-settings");
    });

    it("Test disabling the plugin new tabs", async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));
        await workspacePage.matchWorkspace([[{type: "markdown", file: "B.md", active: true}]]);
    })

    it("Test disable deduplicateTabs", async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md", active: true}, {type: "markdown", file: "B.md"},
        ]]);
    })
})

describe('Test menu options', function() {
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setConfig('focusNewTab', false);
    });

    it("Test bypass new tab", async function() {
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: false });

        await workspacePage.openFile("A.md");
        await workspacePage.openLinkMenuOption(await workspacePage.getLink("B"), "Open in same tab");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it("Test bypass deduplicate", async function() {
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: true });

        await workspacePage.openFile("B.md");
        await workspacePage.openFile("A.md");
        await workspacePage.openLinkMenuOption(await workspacePage.getLink("B"), "Open in duplicate tab");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md"},
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "B.md", active: true},
        ]]);
    })
})
