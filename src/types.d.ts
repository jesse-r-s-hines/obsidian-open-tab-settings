import { PaneType, WorkspaceTabs, WorkspaceMobileDrawer } from 'obsidian';

export type PaneTypePatch = PaneType|"same";

declare module "obsidian" {
    interface WorkspaceLeaf {
        openTabSettingsLastOpenType?: PaneTypePatch|"implicit",
        openTabSettingsOpenedFrom?: string,
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
