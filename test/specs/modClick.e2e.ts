import { browser } from '@wdio/globals'
import workspacePage from '../pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';

describe("Mod click", function() {
    before(async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();
    })
    beforeEach(async function() {
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({
            openInNewTab: true, previewTabs: false,
            deduplicateTabs: true, deduplicateAcrossTabGroups: true,
            newTabPlacement: "afterActive", newTabTabGroupPlacement: "same",
            modClickBehavior: "tab",
        });
        await workspacePage.setConfig("focusNewTab", true);
    });

    it('Test mod click same', async function() {
        await workspacePage.setSettings({ modClickBehavior: "same" });
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md", active: true},
        ]]);

        // regular click still opens in new tab
        await (await workspacePage.getLink("A")).click();

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md"},
            {type: "markdown", file: "A.md", active: true},
        ]]);
    });

    it('Test mod click tab', async function() {
        await workspacePage.setSettings({ modClickBehavior: "tab" });
        await workspacePage.setConfig("focusNewTab", false);
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "markdown", file: "B.md"}, // opens unfocused
        ]]);
    });

    it('Test mod click allowDuplicate', async function() {
        await workspacePage.setSettings({ deduplicateTabs: true, modClickBehavior: "allowDuplicate" });

        await workspacePage.openFile("B.md");
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md"},
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "B.md", active: true},
        ]]);
    });

    it("mod click opposite", async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();
        await workspacePage.setSettings({
            openInNewTab: true, deduplicateTabs: false, modClickBehavior: "opposite",
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

    it("mod click noPreview", async function() {
        await workspacePage.setSettings({ openInNewTab: true, previewTabs: true, deduplicateTabs: false });

        await workspacePage.setSettings({ modClickBehavior: "noPreview" });
        await workspacePage.openFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", isPreview: false},
            {type: "markdown", file: "B.md", active: true, isPreview: false},
        ]]);
    })

    it("mod click placeAfterActive", async function() {
        await workspacePage.setSettings({ newTabPlacement: "end", modClickBehavior: "placeAfterActive" });
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("D.md");
        await workspacePage.setActiveFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "B.md", active: true},
            {type: "markdown", file: "D.md"},
        ]]);
    })

    it("mod click placeAtBeginning", async function() {
        await workspacePage.setSettings({ newTabPlacement: "afterActive", modClickBehavior: "placeAtBeginning" });
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("D.md");
        await workspacePage.setActiveFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md", active: true},
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "D.md"},
        ]]);
    })

    it("mod click placeAtEnd", async function() {
        await workspacePage.setSettings({ newTabPlacement: "afterActive", modClickBehavior: "placeAtEnd" });
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("D.md");
        await workspacePage.setActiveFile("A.md");
        await (await workspacePage.getLink("B")).click({"button": "middle"});
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"},
            {type: "markdown", file: "D.md"},
            {type: "markdown", file: "B.md", active: true},
        ]]);
    })
})
