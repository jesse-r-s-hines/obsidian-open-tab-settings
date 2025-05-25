import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';
import { sleep } from './helpers';
import { WorkspaceParent } from 'obsidian';


describe('Test basic deduplicate', function() {
    beforeEach(async function() {
        await obsidianPage.loadWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: false, deduplicateTabs: true });
        await workspacePage.setConfig('focusNewTab', false);
    });

    it('basic deduplicate', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('basic deduplicate 3 files', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.openFile("D.md");

        await workspacePage.setActiveFile("B.md");
        await workspacePage.openLink(await workspacePage.getLink("A"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true},
            {type: "markdown", file: "B.md"},
            {type: "markdown", file: "D.md"},
        ]]);
    })

    it('re-open file', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFileViaModal("A.md");
        await sleep(250);
        await workspacePage.matchWorkspace([[{type: "markdown", file: "A.md", active: true}]]);
    })

    it('re-open self link', async function() {
        await workspacePage.openFile("Loop.md");
        await workspacePage.openLink(await workspacePage.getLink("Loop.md"));
        await sleep(250);
        await workspacePage.matchWorkspace([[{type: "markdown", file: "Loop.md", active: true}]]);
    })

    it("open self link in new tab focusNewTab true", async function() {
        await workspacePage.setConfig('focusNewTab', true);

        await workspacePage.openFile("Loop.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop.md"));
        await sleep(250);
        await workspacePage.matchWorkspace([[{type: "markdown", file: "Loop.md", active: true}]]);
    })

    it("open self link in new tab focusNewTab false", async function() {
        await workspacePage.setConfig('focusNewTab', false);

        await workspacePage.openFile("Loop.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("Loop.md"));
        await sleep(250);
        await workspacePage.matchWorkspace([[{type: "markdown", file: "Loop.md", active: true}]]);
    })

    it('deduplicate via file explorer', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openFileViaFileExplorer("B.md")

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('deduplicate via sidebar', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("A.md");
        const button = await browser
            .$$(".workspace-tab-header")
            .find(e => e.$("div.*=Outgoing links").isExisting()) as ChainablePromiseElement;
        await button.click()
        const item = browser.$(".workspace-leaf-content[data-type='outgoing-link']").$("div=B");
        await item.click()

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('deduplicate via file modal', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setActiveFile("B.md");
        await workspacePage.openFileViaModal("A.md")

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md", active: true}, {type: "markdown", file: "B.md"},
        ]]);
    })

    it('deduplicate with multiple matches', async function() {
        await workspacePage.setSettings({ deduplicateTabs: false });
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("B.md");
        await workspacePage.openFile("B.md");
        await workspacePage.setSettings({ deduplicateTabs: true });

        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
            {type: "markdown", file: "B.md"},
        ]]);
    })

    it('deduplicate with multiple matches on current file', async function() {
        await workspacePage.setSettings({ deduplicateTabs: false });
        await workspacePage.openFile("A.md");
        await workspacePage.openFile("Loop.md");
        await workspacePage.openFile("Loop.md");
        await workspacePage.setSettings({ deduplicateTabs: true });

        const [loop1, loop2] = await browser.executeObsidian(async ({app}) => {
            const loop1: string = (app.workspace.rootSplit.children[0] as WorkspaceParent).children[1].id
            const loop2: string = (app.workspace.rootSplit.children[0] as WorkspaceParent).children[2].id
            return [loop1, loop2]
        });
        // set the second Loop.md as active
        await browser.executeObsidian(async ({app}, leafId) => {
            app.workspace.setActiveLeaf(app.workspace.getLeafById(leafId)!, {focus: true})
        }, loop2);

        await workspacePage.openLink(await workspacePage.getLink("Loop.md"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "Loop.md"},
            {type: "markdown", file: "Loop.md", active: true},
        ]]);
    })

    it('dedup images', async function() {
        await workspacePage.openFile("image.png");
        await workspacePage.openFile("A.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openFileViaModal("image.png")
        await workspacePage.matchWorkspace([[
            {type: "image", file: "image.png", active: true}, {type: "markdown", file: "A.md"},
        ]]);
    })

    it('dedup png', async function() {
        await workspacePage.openFile("pdf.pdf");
        await workspacePage.openFile("A.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openFileViaModal("pdf.pdf")
        await workspacePage.matchWorkspace([[
            {type: "pdf", file: "pdf.pdf", active: true}, {type: "markdown", file: "A.md"}, 
        ]]);
    })

    it('empty tab', async function() {
        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("workspace:new-tab");
        await workspacePage.openFileViaModal("A.md")
        await workspacePage.matchWorkspace([[{type: "markdown", file: "A.md", active: true}]])
    })

    it('explicit new tab', async function() {
        await workspacePage.setConfig('focusNewTab', true);
        await workspacePage.openFile("B.md");
        await workspacePage.openFile("A.md");
        await workspacePage.setActiveFile("A.md");
        await workspacePage.openLinkInNewTab(await workspacePage.getLink("B"));
        // Should still deduplicate if opened in new tab explicitly
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md", active: true}, {type: "markdown", file: "A.md"},
        ]]);
    })
})
