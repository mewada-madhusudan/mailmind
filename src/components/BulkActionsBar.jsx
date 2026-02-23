import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useMailClassifier } from "../hooks/useMailClassifier";

export default function BulkActionsBar() {
    const { state, dispatch } = useApp();
    const { bulkAction, classifyAndAct } = useMailClassifier();
    const [showMoveMenu, setShowMoveMenu] = useState(false);

    const selected = Array.from(state.selectedMails);
    if (selected.length === 0) return null;

    const run = (action, extra) => { bulkAction(action, selected, extra); setShowMoveMenu(false); };

    return (
        <div className="mm-bulk-bar">
            <span className="mm-bulk-count">{selected.length} selected</span>

            <div className="mm-bulk-actions">
                <button className="mm-bulk-btn" onClick={() => run("markRead")}   title="Mark read">✓ Read</button>
                <button className="mm-bulk-btn" onClick={() => run("markUnread")} title="Mark unread">◌ Unread</button>
                <button className="mm-bulk-btn" onClick={() => run("flag")}       title="Flag">⚑ Flag</button>
                <button className="mm-bulk-btn" onClick={() => run("unflag")}     title="Unflag">⚐ Unflag</button>

                {/* Move to folder */}
                <div style={{ position: "relative" }}>
                    <button className="mm-bulk-btn" onClick={() => setShowMoveMenu(v => !v)}>📁 Move ▾</button>
                    {showMoveMenu && (
                        <div className="mm-bulk-move-menu">
                            {state.folders.map(f => (
                                <button key={f.id} className="mm-bulk-move-item"
                                        onClick={() => run("move", { folderId: f.id })}>
                                    {"  ".repeat(f.depth)}{f.displayName}
                                    {f.unreadItemCount > 0 && <span className="mm-folder-unread" style={{ marginLeft: "auto" }}>{f.unreadItemCount}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button className="mm-bulk-btn danger" onClick={() => run("delete")}>🗑 Delete</button>

                <div className="mm-bulk-sep" />

                <button className="mm-bulk-btn primary"
                        onClick={() => classifyAndAct(selected)}
                        disabled={state.classifying}>
                    {state.classifying ? "Classifying…" : "⚡ Classify"}
                </button>
            </div>

            <button className="mm-bulk-deselect" onClick={() => dispatch({ type: "CLEAR_SELECTION" })}>✕</button>
        </div>
    );
}