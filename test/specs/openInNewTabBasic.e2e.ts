import { browser } from '@wdio/globals'
import workspacePage from 'test/pageobjects/workspace.page';
import { obsidianPage } from 'wdio-obsidian-service';


describe('Test basic open in new tab', function() {
    beforeEach(async function() {
        await obsidianPage.resetVault();
        await workspacePage.loadPlatformWorkspaceLayout("empty");
        await workspacePage.setSettings({ openInNewTab: true, deduplicateTabs: false });
        await workspacePage.setConfig('focusNewTab', false);
    });

    it('opens in new tab and focuses when focusNewTab is false', async function() {
        await workspacePage.setConfig('focusNewTab', false);
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('opens in new tab and focuses when focusNewTab is true', async function() {
        await workspacePage.setConfig('focusNewTab', true);
        // The new tab should focus regardless of focusNewTab setting.
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("B"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('opens in new tab from file explorer', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFileViaFileExplorer("B.md");

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('opens in new tab from file modal', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFileViaFileExplorer("B.md");

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('opens in new tab from sidebar outgoing links', async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();
        await workspacePage.openFile("A.md");
        const button: ChainablePromiseElement = await browser
            .$$(".workspace-tab-header")
            .find(e => e.$("div.*=Outgoing links").isExisting());
        await button.click();
        const item = browser.$(".workspace-leaf-content[data-type='outgoing-link']").$("div=B");
        await item.click();
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('opens images in new tab', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFileViaQuickSwitcher("image.png");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "image", file: "image.png", active: true},
        ]]);
    })

    it('opens pdfs in new tab', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openFileViaQuickSwitcher("pdf.pdf");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "pdf", file: "pdf.pdf", active: true},
        ]]);
    })

    it('opens file from pdfs opens in new tab', async function() {
        await workspacePage.openFile("pdf.pdf");
        await workspacePage.openFileViaQuickSwitcher("A.md");
        await workspacePage.matchWorkspace([[
            {type: "pdf", file: "pdf.pdf"}, {type: "markdown", file: "A.md", active: true},
        ]]);
    })

    it('graph view opens in new tab', async function() {
        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("graph:open");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "graph", active: true},
        ]]);
    })

    it('open file while on graph view opens in new tab', async function() {
        await browser.executeObsidianCommand("graph:open");
        await workspacePage.openFileViaQuickSwitcher("A.md");
        await workspacePage.matchWorkspace([[
            {type: "graph"}, {type: "markdown", file: "A.md", active: true},
        ]]);
    })

    it('open daily note opens in new tab', async function() {
        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("daily-notes");
        await browser.waitUntil(async () => (await workspacePage.getAllLeaves())[0].length >= 2);
        const leaves = (await workspacePage.getAllLeaves())[0];
        expect(leaves[0].file).toEqual("A.md");
        const activeLeaf = await workspacePage.getActiveLeaf();
        expect(activeLeaf.file).toMatch(/\d\d\d\d-\d\d-\d\d/);
    })

    it('opens in new tab from bookmarks', async function() {
        if ((await obsidianPage.getPlatform()).isMobile) this.skip();
        await workspacePage.openFile("A.md");
        const button: ChainablePromiseElement = await browser
            .$$(".workspace-tab-header")
            .find(e => e.$("div.*=Bookmarks").isExisting());
        await button.click();
        const item = browser.$(".workspace-leaf-content[data-type='bookmarks'] [data-path=B]");
        await item.click();
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })

    it('open self link', async function() {
        await workspacePage.openFile("Loop.md");
        const prevActiveLeaf = (await workspacePage.getActiveLeaf()).id;
        await workspacePage.openLink(await workspacePage.getLink("Loop.md"));
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "Loop.md"}, {type: "markdown", file: "Loop.md", active: true},
        ]]);
        expect((await workspacePage.getActiveLeaf()).id).not.toEqual(prevActiveLeaf);
    })

    it('re-open file', async function() {
        await workspacePage.openFile("Loop.md");
        const prevActiveLeaf = (await workspacePage.getActiveLeaf()).id;
        await workspacePage.openFileViaQuickSwitcher("Loop.md");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "Loop.md"}, {type: "markdown", file: "Loop.md", active: true},
        ]]);
        expect((await workspacePage.getActiveLeaf()).id).not.toEqual(prevActiveLeaf);
    })

    it("internal link", async function() {
        await workspacePage.openFile("Loop.md");
        await workspacePage.setActiveFile("Loop.md")

        await workspacePage.openLink(await workspacePage.getLink("Loop.md#Subheading"));
        await $(".is-flashing").waitForExist(); // check we get the internal link highlight
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "Loop.md"},
        ]]);
    })

    it("open new file", async function() {
        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("file-explorer:new-file");
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "Untitled.md", active: true}
        ]]);
    })
    
    it("open new file in current tab", async function() {
        await workspacePage.openFile("A.md");
        await browser.executeObsidianCommand("file-explorer:new-file-in-current-tab");
        // TODO: Should probably fix this behavior
        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "markdown", file: "Untitled.md", active: true}
        ]]);
    })

    it('open new file via link', async function() {
        await workspacePage.openFile("B.md");
        await workspacePage.openLink(await workspacePage.getLink("C"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "B.md"}, {type: "markdown", file: "C.md", active: true},
        ]]);
    })

    it('open canvas opens in new tab', async function() {
        await workspacePage.openFile("A.md");
        await workspacePage.openLink(await workspacePage.getLink("Canvas.canvas"));

        await workspacePage.matchWorkspace([[
            {type: "markdown", file: "A.md"}, {type: "canvas", file: "Canvas.canvas", active: true},
        ]]);
    })

    it('open link in canvas', async function() {
        await workspacePage.openFile("Canvas.canvas");
        // Focus a node
        const node = browser.$(".canvas-node-label=A").$("..");
        await node.click();
        // click a link in the node
        await node.$("a=B").click();

        await workspacePage.matchWorkspace([[
            {type: "canvas", file: "Canvas.canvas"}, {type: "markdown", file: "B.md", active: true},
        ]]);
    })
})
