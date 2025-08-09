import * as path from "path"
import { parseObsidianVersions, obsidianBetaAvailable } from "wdio-obsidian-service";
import merge from "lodash.merge";
import { env } from "process";

// wdio-obsidian-service will download Obsidian versions into this directory
const cacheDir = path.resolve(".obsidian-cache");

// choose Obsidian versions to test
let defaultVersions = "earliest/earliest latest/latest";
if (await obsidianBetaAvailable({cacheDir})) {
    defaultVersions += " latest-beta/latest"
}
const desktopVersions = await parseObsidianVersions(
    env.OBSIDIAN_VERSIONS ?? defaultVersions,
    {cacheDir},
);
const mobileVersions = await parseObsidianVersions(
    env.OBSIDIAN_MOBILE_VERSIONS ?? env.OBSIDIAN_VERSIONS ?? defaultVersions,
    {cacheDir},
);
if (env.CI) {
    // Print the resolved Obsidian versions to use as the workflow cache key
    // (see .github/workflows/test.yaml)
    console.log("obsidian-cache-key:", JSON.stringify([desktopVersions, mobileVersions]));
}

const common: WebdriverIO.Capabilities = {
    browserName: 'obsidian',
    'wdio:obsidianOptions': {
        plugins: [
            ".",
            {id: "obsidian-excalidraw-plugin", enabled: false},
            {id: "home-tab", enabled: false},
            {id: "obsidian-kanban", enabled: false},
        ],
        vault: "./test/vault",
    },
}

export const config: WebdriverIO.Config = {
    runner: 'local',
    framework: 'mocha',

    specs: ['./test/specs/**/*.e2e.ts'],

    // How many instances of Obsidian should be launched in parallel during testing.
    maxInstances: Number(env.WDIO_MAX_INSTANCES || 4),

    // "matrix" to test your plugin on multiple Obsidian versions and with emulateMobile
    capabilities: [
        ...desktopVersions.map(([appVersion, installerVersion]) => merge({}, common, {
            'wdio:obsidianOptions': {
                appVersion, installerVersion,
            },
        })),
        // Test the plugin on the emulated mobile UI.
        ...mobileVersions.map(([appVersion, installerVersion]) => merge({}, common, {
            'wdio:obsidianOptions': {
                appVersion, installerVersion,
                emulateMobile: true,
            },
            'goog:chromeOptions': {
                mobileEmulation: {
                    deviceMetrics: {width: 390, height: 844, touch: false},
                },
            },
        })),
    ],

    services: ["obsidian"],
    reporters: ['obsidian'],

    bail: 2,
    mochaOpts: {
        ui: 'bdd',
        timeout: 60 * 1000,
        retries: 4,
        bail: true,
    },
    waitforInterval: 250,
    waitforTimeout: 5 * 1000,
    logLevel: "warn",

    cacheDir: cacheDir,
}
