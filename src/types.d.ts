import { PaneType, WorkspaceTabs, WorkspaceMobileDrawer } from 'obsidian';
import { OpenTabSettingsPluginSettings } from './settings';

declare module "obsidian" {
    interface WorkspaceLeaf {
        openTabSettings?: {
            openMode: PaneType|false,
            override: Partial<OpenTabSettingsPluginSettings>,
            openedFrom?: string,
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
