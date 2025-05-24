import {PaneType} from 'obsidian';

/** We use this key to check if can safely close a recently created empty leaf during file deduplication. */
export type PaneTypePatch = PaneType|"same";
declare module "obsidian" {
    interface WorkspaceLeaf {
        openTabSettingsLastOpenType?: PaneTypePatch,
    }

    interface WorkspaceParent {
        removeChild(leaf: WorkspaceLeaf): void,
        insertChild(index: number, leaf: WorkspaceLeaf): void,
        selectTabIndex(index: number): void,
        children: WorkspaceItem[],
    }
}
