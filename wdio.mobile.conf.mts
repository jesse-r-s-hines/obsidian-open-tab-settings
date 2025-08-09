import * as path from "path"
import { parseObsidianVersions } from "wdio-obsidian-service";
import { env } from "process";

const cacheDir = path.resolve(".obsidian-cache");

// choose Obsidian versions to test
// note: beta versions aren't available for the Android app
let defaultVersions = "earliest/earliest latest/latest";
const versions = await parseObsidianVersions(
    env.OBSIDIAN_MOBILE_VERSIONS ?? env.OBSIDIAN_VERSIONS ?? defaultVersions,
    {cacheDir},
);
if (env.CI) {
    console.log("obsidian-cache-key:", JSON.stringify(versions));
}

export const config: WebdriverIO.Config = {
    runner: 'local',
    framework: 'mocha',

    specs: ['./test/specs/**/*.e2e.ts'],

    maxInstances: 1, // Parallel tests don't work under appium
    hostname: env.APPIUM_HOST || 'localhost',
    port: parseInt(env.APPIUM_PORT || "4723"),

    // (installerVersion isn't relevant for the mobile app)
    capabilities: versions.map<WebdriverIO.Capabilities>(([appVersion]) => ({
        browserName: "obsidian",
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:avd': "obsidian_test",
        'appium:enforceAppInstall': true,
        'appium:adbExecTimeout': 60 * 1000,
        'wdio:obsidianOptions': {
            appVersion: appVersion,
            plugins: [
                ".",
                {id: "obsidian-excalidraw-plugin", enabled: false},
                {id: "home-tab", enabled: false},
                {id: "obsidian-kanban", enabled: false},
            ],
            vault: "./test/vault",
        },
    })),

    services: [
        "obsidian",
        ["appium", {
            args: { allowInsecure: "chromedriver_autodownload,adb_shell" },
        }],
    ],
    reporters: ["obsidian"],

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
