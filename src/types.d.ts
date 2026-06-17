import { PaneType, WorkspaceTabs, WorkspaceMobileDrawer, WorkspaceItem } from 'obsidian';
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
        },
        pinned: boolean,
    }

    interface WorkspaceParent {
        removeChild(leaf: WorkspaceLeaf): void,
        insertChild(index: number, leaf: WorkspaceLeaf): void,
        selectTabIndex(index: number): void,
        children: WorkspaceItem[],
        currentTab: number,
        isStacked: boolean,
    }

    interface WorkspaceTabs {
        children: WorkspaceLeaf[],
    }

    interface WorkspaceMobileDrawer {
        children: WorkspaceLeaf[],
        currentTab: number,
        isStacked: boolean,
    }
}

type TabGroup = WorkspaceTabs|WorkspaceMobileDrawer;
