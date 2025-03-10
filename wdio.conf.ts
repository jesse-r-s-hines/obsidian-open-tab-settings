import * as path from "path"

export const config: WebdriverIO.Config = {
    runner: 'local',
    tsConfigPath: './test/tsconfig.json',
    
    specs: [
        './test/specs/**/*.e2e.ts'
    ],

    // How many instances of Obsidian should be launched in parallel during testing.
    maxInstances: 4,

    capabilities: [{
        browserName: 'obsidian',
        browserVersion: "latest",
        'wdio:obsidianOptions': {
            installerVersion: "latest",
            plugins: ["."],
            vault: "./test/vault",
        },
    }],

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

