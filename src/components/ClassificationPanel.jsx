// components/ClassificationPanel.jsx — Salt DS version
import { useApp } from "../context/AppContext";

export default function ClassificationPanel() {
    const { state } = useApp();
    const entries = Object.entries(state.classifications);

    if (state.classifying) {
        return (
            <div className="mm-empty">
                <div className="mm-spinner lg" />
                <p>Waiting for LLMSuite to classify emails…</p>
                {state.classificationProgress && (
                    <div className="mm-progress-wrap">
                        <div className="mm-progress-track">
                            <div
                                className="mm-progress-bar"
                                style={{
                                    width: `${(state.classificationProgress.processed / state.classificationProgress.total) * 100}%`,
                                }}
                            />
                        </div>
                        <span className="mm-progress-label">
              {state.classificationProgress.processed} / {state.classificationProgress.total} emails
            </span>
                    </div>
                )}
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="mm-empty">
                <span className="mm-empty-icon">◎</span>
                <p>No classification results yet</p>
                <p className="sub">
                    Select emails in Inbox, then click "⚡ Classify" to get started
                </p>
            </div>
        );
    }

    const actionResults = state.actionResults || [];
    const succeeded = actionResults.filter((r) => r.success).length;
    const failed = actionResults.length - succeeded;

    return (
        <div className="mm-panel">
            {/* Stats */}
            <div className="mm-stats">
                <div className="mm-stat">
                    <span className="mm-stat-val">{entries.length}</span>
                    <span className="mm-stat-label">Emails Classified</span>
                </div>
                <div className="mm-stat">
                    <span className="mm-stat-val">{succeeded}</span>
                    <span className="mm-stat-label">Actions Applied</span>
                </div>
                <div className="mm-stat">
          <span className="mm-stat-val" style={failed > 0 ? { color: "#dc2626" } : {}}>
            {failed}
          </span>
                    <span className="mm-stat-label">Failed</span>
                </div>
            </div>

            {/* Results */}
            <div className="mm-result-list">
                {entries.map(([messageId, cl]) => {
                    const mail = state.mails.find((m) => m.id === messageId);
                    const related = actionResults.filter((r) => r.messageId === messageId);

                    return (
                        <div key={messageId} className="mm-result-card">
                            <div className="mm-result-header">
                <span className="mm-result-subject">
                  {mail?.subject || "Unknown email"}
                </span>
                                <span className={`mm-conf-badge ${confLevel(cl.confidence)}`}>
                  {Math.round(cl.confidence * 100)}% confidence
                </span>
                            </div>

                            <div className="mm-result-row">
                                <span className="mm-field-label">RULE</span>
                                <span>{cl.matchedRule}</span>
                            </div>
                            <div className="mm-result-row">
                                <span className="mm-field-label">WHY</span>
                                <span>{cl.reasoning}</span>
                            </div>

                            {cl.actions?.length > 0 && (
                                <div>
                                    <div className="mm-result-row" style={{ marginBottom: 4 }}>
                                        <span className="mm-field-label">ACTIONS</span>
                                    </div>
                                    <div className="mm-action-tags">
                                        {cl.actions.map((action, i) => {
                                            const res = related.find((r) => r.action === action.action);
                                            return (
                                                <span
                                                    key={i}
                                                    className={`mm-action-tag ${res ? (res.success ? "success" : "failed") : ""}`}
                                                >
                          {actionEmoji(action.action)} {action.action}
                                                    {action.flagStatus    ? `: ${action.flagStatus}`    : ""}
                                                    {action.importance    ? `: ${action.importance}`    : ""}
                                                    {action.isRead !== undefined ? `: ${action.isRead ? "read" : "unread"}` : ""}
                                                    {res && !res.success  ? ` ✗ ${res.error}`          : ""}
                        </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function confLevel(c) {
    if (c >= 0.8) return "high";
    if (c >= 0.5) return "medium";
    return "low";
}

function actionEmoji(action) {
    return { move: "📁", flag: "⚑", markRead: "✓", categorise: "🏷", setImportance: "!", delete: "🗑" }[action] || "→";
}