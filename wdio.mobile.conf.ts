import * as path from "path"

let versionsToTest: string[]
if (process.env.OBSIDIAN_VERSIONS) {
    versionsToTest = process.env.OBSIDIAN_VERSIONS.split(/[ ,]+/)
} else {
    versionsToTest = ["earliest", "latest"];
}

export const config: WebdriverIO.Config = {
    runner: 'local',
    framework: 'mocha',
    maxInstances: 1, // can't do android tests in parallel :(
    specs: ['./test/specs/**/*.e2e.ts'],

    hostname: 'localhost',
    port: parseInt(process.env.APPIUM_PORT || "4723"),

    capabilities: versionsToTest.map((version) => ({
        browserName: "obsidian",
        browserVersion: version,
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:avd': "obsidian_test",
        'appium:enforceAppInstall': true,
        'appium:adbExecTimeout': 60 * 1000,
        'wdio:obsidianOptions': {
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

    cacheDir: path.resolve(".obsidian-cache"),
    bail: 2,
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
        retries: 4,
        bail: true,
    },
    waitforInterval: 250,
    waitforTimeout: 5 * 1000,
    logLevel: "warn",
}
