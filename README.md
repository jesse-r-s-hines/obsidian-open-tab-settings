[![Test](https://github.com/jesse-r-s-hines/obsidian-open-tab-settings/actions/workflows/test.yaml/badge.svg?branch=main)](https://github.com/jesse-r-s-hines/obsidian-open-tab-settings/actions/workflows/test.yaml)
# Obsidian Open Tab Settings

This plugin adds more settings for how Obsidian opens tabs and navigates between files including options to:
- Open in new tab by default
- Switch to existing tab instead of opening a duplicate file

Using these settings can enable a more familiar workflow for those used to working in editors like VSCode.

There are several plugins already that attempt to solve this problem with different pros and cons. However, most other
options either only work in specific menus or have to use a timer delay before applying the new behavior, resulting in
the current note visibly navigating to the new file before switching to the new tab.

[Opener](https://github.com/aidan-gibson/obsidian-opener) is the most similar plugin to "Open Tab Settings", and heavily
inspired this plugin. It patches Obsidian methods to modify Obsidian's default behavior across the app. However, it is
no longer actively maintained, and broken on the latest Obsidian version last I checked.

Like "Opener", "Open Tab Settings" works by patching Obsidian's `openFile` method to achieve consistent new tab behavior
throughout Obsidian, including the file explorer, links, quick switcher, etc. It avoids a few small caveats in "Opener"
by patching Obsidian's `getLeaf` function so that actions like "Open Graph" also open in a new tab.

## Local Development
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
