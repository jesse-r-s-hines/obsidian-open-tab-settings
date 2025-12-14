import { PaneType, WorkspaceTabs, WorkspaceMobileDrawer } from 'obsidian';

export type PaneTypePatch = PaneType|"same"|"allow-duplicate";

declare module "obsidian" {
    interface WorkspaceLeaf {
        openTabSettings?: {
            openType: PaneTypePatch,
            implicitOpen: boolean,
            allowDuplicate: boolean,
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
