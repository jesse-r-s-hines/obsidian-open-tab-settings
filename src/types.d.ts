import { PaneType, WorkspaceLeaf, WorkspaceTabs } from 'obsidian';
import { OpenTabSettingsPluginSettings } from './settings';

declare module "obsidian" {
    interface WorkspaceLeaf {
        openTabSettings?: {
            openInfo?: {
                openMode: PaneType|false,
                override: Partial<OpenTabSettingsPluginSettings>,
                openedFrom?: string,
            },
            /** true when a leaf has just been opened, set to false the leaf is interacted with */
            isPreview?: boolean,
            eventCleanup?: () => void,
            openedTime?: number,
        },
    }
}

export type TabGroup = Omit<WorkspaceTabs, 'children'> & {children: WorkspaceLeaf[]};
