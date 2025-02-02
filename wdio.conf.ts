import { ObsidianWorkerService, ObsidianLauncherService } from "obsidian-plugin-testing-library"
import * as path from "path"

export const config: WebdriverIO.Config = {
	runner: 'local',
	tsConfigPath: './test/tsconfig.json',
	
	specs: [
		'./test/specs/**/*.ts'
	],

	// How many instances of Obsidian should be launched in parallel during testing.
	maxInstances: 4,

	capabilities: [{
		browserName: 'obsidian',
		browserVersion: "latest",
		'wdio:obsidianOptions': {
			installerVersion: "earliest",
			plugins: ["."],
		},
	}],

	services: [[ObsidianWorkerService, {}], [ObsidianLauncherService, {}]],

	framework: 'mocha',

	reporters: ['spec'],

	mochaOpts: {
		ui: 'bdd',
		timeout: 60000
	},

	cacheDir: path.resolve(".optl-cache"),

 	logLevel: "warn",
}

