import { useApp } from "../context/AppContext";
import { useMailClassifier } from "../hooks/useMailClassifier";

// Well-known folder icons
const FOLDER_ICONS = {
    inbox:        "📥",
    sentitems:    "📤",
    drafts:       "📝",
    deleteditems: "🗑",
    junkemail:    "⚠",
    archive:      "📦",
    outbox:       "📮",
    recoverableitemsdeletions: "♻",
};

function folderIcon(name = "") {
    const key = name.toLowerCase().replace(/\s/g, "");
    return FOLDER_ICONS[key] || "📁";
}

export default function FolderTree() {
    const { state, dispatch } = useApp();
    const { fetchMails, loadFolders } = useMailClassifier();

    const selectFolder = (folder) => {
        dispatch({ type: "SET_ACTIVE_FOLDER", id: folder.id });
        fetchMails(folder.id);
    };

    const toggle = (e, id) => {
        e.stopPropagation();
        dispatch({ type: "TOGGLE_FOLDER_EXPAND", id });
    };

    if (state.foldersLoading) {
        return (
            <div style={{ padding: "12px 10px", display: "flex", alignItems: "center", gap: 8, color: "var(--text3)", fontSize: 12 }}>
                <div className="mm-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Loading folders…
            </div>
        );
    }

    if (!state.folders.length) {
        return (
            <div style={{ padding: "10px 10px" }}>
                <button className="mm-nav-btn" style={{ fontSize: 12 }} onClick={loadFolders}>
                    ↻ Load folders
                </button>
            </div>
        );
    }

    // Build visible folder list — hide children of collapsed parents
    const visible = [];
    const collapsedIds = new Set();
    for (const folder of state.folders) {
        // If any ancestor is collapsed, skip this folder
        if (folder.depth > 0) {
            const parent = state.folders.find(f => f.id === folder.parentFolderId);
            if (!parent || !state.expandedFolders.has(parent.id)) {
                collapsedIds.add(folder.id);
                continue;
            }
            if ([...collapsedIds].some(cId => folder.parentFolderId === cId)) {
                collapsedIds.add(folder.id);
                continue;
            }
        }
        visible.push(folder);
    }

    // Check which folders have children
    const hasChildren = new Set(state.folders.filter(f => f.depth > 0).map(f => f.parentFolderId));

    return (
        <div className="mm-folder-tree">
            {visible.map(folder => {
                const isActive = folder.id === state.activeFolderId;
                const isExpanded = state.expandedFolders.has(folder.id);
                const canExpand = hasChildren.has(folder.id);
                const indent = folder.depth * 14;

                return (
                    <div
                        key={folder.id}
                        className={`mm-folder-item${isActive ? " active" : ""}`}
                        style={{ paddingLeft: 10 + indent }}
                        onClick={() => selectFolder(folder)}
                    >
                        {/* Expand toggle */}
                        <span
                            className="mm-folder-chevron"
                            style={{ opacity: canExpand ? 1 : 0, pointerEvents: canExpand ? "auto" : "none" }}
                            onClick={(e) => toggle(e, folder.id)}
                        >
              {isExpanded ? "▾" : "▸"}
            </span>

                        {/* Icon + name */}
                        <span className="mm-folder-icon">{folderIcon(folder.displayName)}</span>
                        <span className="mm-folder-name">{folder.displayName}</span>

                        {/* Unread badge */}
                        {folder.unreadItemCount > 0 && (
                            <span className="mm-folder-unread">{folder.unreadItemCount > 99 ? "99+" : folder.unreadItemCount}</span>
                        )}
                    </div>
                );
            })}

            <button className="mm-folder-refresh" onClick={loadFolders} title="Refresh folder list">
                ↻ Refresh folders
            </button>
        </div>
    );
}