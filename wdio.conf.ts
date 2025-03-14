import * as path from "path"

let versions: [string, string][]; // [appVersion, installerVersion][]
if (process.env['OBSIDIAN_VERSIONS']) {
    const appVersions = process.env['OBSIDIAN_VERSIONS'].split(/[ ,]+/);
    let installerVersions: string[];
    if (process.env['OBSIDIAN_INSTALLER_VERSIONS']) {
        installerVersions = process.env['OBSIDIAN_INSTALLER_VERSIONS'].split(/[ ,]+/);
    } else {
        installerVersions = appVersions.map(() => "earliest");
    }
    if (installerVersions.length != appVersions.length) {
        throw Error("OBSIDIAN_VERSIONS and OBSIDIAN_INSTALLER_VERSIONS must be the same length");
    }
    versions = appVersions.map((v, i) => [v, installerVersions[i]]);
} else {
    versions = [["earliest", "earliest"], ["latest", "latest"]]
}

export const config: WebdriverIO.Config = {
    runner: 'local',

    specs: [
        './test/specs/**/*.e2e.ts'
    ],

    // How many instances of Obsidian should be launched in parallel during testing.
    maxInstances: Number(process.env["WDIO_MAX_INSTANCES"] ?? 2),

    capabilities: versions.map(([appVersion, installerVersion]) => ({
        browserName: 'obsidian',
        browserVersion: appVersion,
        'wdio:obsidianOptions': {
            installerVersion: installerVersion,
            plugins: ["."],
            vault: "./test/vault",
        },
    })),

    services: ["obsidian"],

    framework: 'mocha',

    reporters: ['spec'],

    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },

    waitforInterval: 100,

    cacheDir: path.resolve(".obsidian-cache"),

    logLevel: "warn",
}
