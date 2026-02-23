import { useApp } from "../context/AppContext";
import { useMailClassifier } from "../hooks/useMailClassifier";

export default function ReadPane() {
    const { state, dispatch } = useApp();
    const { bulkAction } = useMailClassifier();
    const { activeMailId, activeMailBody, bodyLoading, mails } = state;

    if (!activeMailId) return null;

    const mail = mails.find(m => m.id === activeMailId);
    const body = activeMailBody;

    const close = () => dispatch({ type: "CLOSE_READ_PANE" });

    const quickFlag = () => bulkAction(
        mail?.flag?.flagStatus === "flagged" ? "unflag" : "flag", [activeMailId]
    );

    const quickDelete = () => { bulkAction("delete", [activeMailId]); close(); };

    return (
        <div className="mm-read-pane">
            {/* Header */}
            <div className="mm-read-header">
                <button className="mm-read-close" onClick={close} title="Close">×</button>
                <div className="mm-read-actions">
                    <button
                        className={`mm-read-action-btn${mail?.flag?.flagStatus === "flagged" ? " active" : ""}`}
                        onClick={quickFlag} title="Flag">⚑</button>
                    <button className="mm-read-action-btn" onClick={quickDelete} title="Delete">🗑</button>
                </div>
            </div>

            {bodyLoading ? (
                <div className="mm-read-loading">
                    <div className="mm-spinner lg" />
                    <p>Loading email…</p>
                </div>
            ) : body ? (
                <div className="mm-read-body">
                    {/* Subject */}
                    <h2 className="mm-read-subject">{body.subject || "(No Subject)"}</h2>

                    {/* Meta */}
                    <div className="mm-read-meta">
                        <div className="mm-read-from">
              <span className="mm-read-avatar">
                {(body.from?.emailAddress?.name || "?")[0].toUpperCase()}
              </span>
                            <div>
                                <div className="mm-read-from-name">{body.from?.emailAddress?.name || body.from?.emailAddress?.address}</div>
                                <div className="mm-read-from-addr">{body.from?.emailAddress?.address}</div>
                            </div>
                        </div>
                        <div className="mm-read-date">
                            {new Date(body.receivedDateTime).toLocaleString(undefined, {
                                weekday: "short", month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                            })}
                        </div>
                    </div>

                    {/* To / CC */}
                    {body.toRecipients?.length > 0 && (
                        <div className="mm-read-recipients">
                            <span className="mm-read-recip-label">To:</span>
                            {body.toRecipients.map(r => r.emailAddress?.address).join(", ")}
                        </div>
                    )}
                    {body.ccRecipients?.length > 0 && (
                        <div className="mm-read-recipients">
                            <span className="mm-read-recip-label">CC:</span>
                            {body.ccRecipients.map(r => r.emailAddress?.address).join(", ")}
                        </div>
                    )}

                    <div className="mm-read-divider" />

                    {/* Body — render HTML safely in sandboxed iframe */}
                    {body.body?.contentType === "html" ? (
                        <iframe
                            className="mm-read-iframe"
                            srcDoc={body.body.content}
                            sandbox="allow-same-origin"
                            title="Email body"
                        />
                    ) : (
                        <pre className="mm-read-text">{body.body?.content || "(No content)"}</pre>
                    )}
                </div>
            ) : (
                <div className="mm-read-loading"><p>Could not load email.</p></div>
            )}
        </div>
    );
}