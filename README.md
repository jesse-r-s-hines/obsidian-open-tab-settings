[![Test](https://github.com/jesse-r-s-hines/obsidian-open-tab-settings/actions/workflows/test.yaml/badge.svg?branch=main)](https://github.com/jesse-r-s-hines/obsidian-open-tab-settings/actions/workflows/test.yaml)
# Open Tab Settings

This plugin adds more settings to customize how Obsidian opens tabs and navigates between files including options to:
- open in new tab by default
- switch to existing tab instead of opening a duplicate file
- place new tabs at the end, or after pinned tabs
- open new tabs in the opposite pane when using a split workspace

Using these settings can enable a more familiar workflow for those used to working in editors like VSCode. With the "Always open in new tab" toggled, Obsidian will always open files in a new tab, whether they were opened via links, the quick switcher, file explorer, etc. Never accidentally lose your tabs again!

There are several plugins already that attempt to solve this problem with different pros and cons. However, most other options either only work in specific menus or have to use a noticeable timer delay before opening new tabs. The [Opener](https://github.com/aidan-gibson/obsidian-opener) plugin is the most similar plugin to "Open Tab Settings", and heavily inspired this plugin. Opener patches some internal Obsidian methods to modify Obsidian's default behavior across the app without needing any timer delays. However, it is no longer actively maintained, and broken on the latest Obsidian version last I checked. Like "Opener", "Open Tab Settings" works by patching Obsidian's internal methods to achieve consistent new tab behavior throughout Obsidian. It also avoids a few small caveats "Opener" had by making actions like "Open Graph" also open in a new tab.

## Contributing
You can build the plugin with:
```shell
npm install
npm run build
```

This plugin has end-to-end tests using [wdio-obsidian-service](https://github.com/jesse-r-s-hines/wdio-obsidian-service)
and [WebdriverIO](https://webdriver.io/).
Run them with:
```shell
npm run test
```
This will automatically download the latest Obsidian version and test the plugin against it.
