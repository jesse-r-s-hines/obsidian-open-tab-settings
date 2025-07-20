import * as path from "path"
import { obsidianBetaAvailable, resolveObsidianVersions } from "wdio-obsidian-service";

const cacheDir = path.resolve(".obsidian-cache");

let versions: [string, string][]; // [appVersion, installerVersion][]
if (process.env.OBSIDIAN_VERSIONS) {
    // Space separated list of appVersion/installerVersion, e.g. "1.7.7/latest latest/earliest"
    versions = process.env.OBSIDIAN_VERSIONS.split(/[ ,]+/).map(v => {
        const [app, installer = "earliest"] = v.split("/"); // default to earliest installer
        return [app, installer];
    })
} else if (process.env.CI) {
    // Running in GitHub CI. You can use RUNNER_OS to select different versions on different
    // platforms in the workflow matrix if you want
    versions = [["earliest", "earliest"], ["latest", "latest"]];
    if (await obsidianBetaAvailable(cacheDir)) {
        versions.push(["latest-beta", "latest"]);
    }

    // Print the resolved Obsidian versions to use as the workflow cache key
    // (see .github/workflows/test.yaml)
    for (let [app, installer] of versions) {
        [app, installer] = await resolveObsidianVersions(app, installer, cacheDir);
        console.log(`${app}/${installer}`);
    }
} else {
    versions = [["earliest", "earliest"], ["latest", "latest"]];
}

export const config: WebdriverIO.Config = {
    runner: 'local',

    specs: [
        './test/specs/**/*.e2e.ts'
    ],

    // How many instances of Obsidian should be launched in parallel during testing.
    maxInstances: Number(process.env["WDIO_MAX_INSTANCES"] || 4),

    capabilities: versions.flatMap(([appVersion, installerVersion]) => {
        const common: WebdriverIO.Capabilities = {
            browserName: 'obsidian',
            browserVersion: appVersion,
            'wdio:obsidianOptions': {
                installerVersion: installerVersion,
                plugins: [
                    ".",
                    {id: "obsidian-excalidraw-plugin", enabled: false},
                    {id: "home-tab", enabled: false},
                    {id: "obsidian-kanban", enabled: false},
                ],
                vault: "./test/vault",
            },
        }
        return [
            {...common},
            {
                ...common,
                'wdio:obsidianOptions': {
                    ...common['wdio:obsidianOptions'],
                    emulateMobile: true,
                },
                'goog:chromeOptions': {
                    mobileEmulation: {
                        // can also set deviceName: "iPad" etc. instead of hard-coding size
                        deviceMetrics: {width: 390, height: 844, touch: false},
                    },
                },
            },
        ]
    }),

    framework: 'mocha',
    services: ["obsidian"],
    reporters: ['obsidian'],

    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
        // Retry flaky tests
        // TODO: Fix the timing issues
        retries: 4,
        bail: true,
    },

    waitforInterval: 250,
    waitforTimeout: 5 * 1000,

    cacheDir: cacheDir,

    logLevel: "warn",
}
