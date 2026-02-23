// components/MailList.jsx — Salt DS Button + Tooltip, native checkbox
import { useApp } from "../context/AppContext";
import { useMailClassifier } from "../hooks/useMailClassifier";

export default function MailList() {
    const { state, dispatch } = useApp();
    const { classifyAndAct } = useMailClassifier();

    const allSelected = state.mails.length > 0 && state.selectedMails.size === state.mails.length;
    const someSelected = state.selectedMails.size > 0 && !allSelected;

    if (state.mailsLoading) {
        return (
            <div className="mm-empty">
                <div className="mm-spinner lg" />
                <p>Fetching emails from Outlook…</p>
            </div>
        );
    }
    if (state.mailsError) {
        return (
            <div className="mm-empty">
                <span className="mm-empty-icon">⚠</span>
                <p style={{ color: "#dc2626" }}>{state.mailsError}</p>
            </div>
        );
    }
    if (state.mails.length === 0) {
        return (
            <div className="mm-empty">
                <span className="mm-empty-icon">✉</span>
                <p>No emails loaded yet</p>
                <p className="sub">Click "Sync Mail" to fetch unread emails from Outlook</p>
            </div>
        );
    }

    return (
        <div>
            {/* Controls */}
            <div className="mm-mail-controls">
                <label className="mm-check-label">
                    <input
                        type="checkbox"
                        className="mm-checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={() => dispatch({ type: allSelected ? "CLEAR_SELECTION" : "SELECT_ALL_MAILS" })}
                    />
                    {allSelected ? "Deselect all" : "Select all"}
                </label>
                <span className="mm-select-count">{state.selectedMails.size} / {state.mails.length} selected</span>
                {state.selectedMails.size > 0 && (
                    <button className="mm-btn mm-btn-primary" onClick={() => classifyAndAct()} disabled={state.classifying}
                            style={{ marginLeft: "auto", fontSize: 12, padding: "4px 14px" }}>
                        ⚡ Classify selected
                    </button>
                )}
            </div>

            {/* Rows */}
            {state.mails.map((mail) => {
                const cl = state.classifications[mail.id];
                const isSelected = state.selectedMails.has(mail.id);
                return (
                    <div key={mail.id} className={`mm-mail-row ${isSelected ? "selected" : ""} ${cl ? "classified" : ""}`}>
                        <input
                            type="checkbox"
                            className="mm-checkbox"
                            checked={isSelected}
                            onChange={() => dispatch({ type: "TOGGLE_MAIL_SELECTED", id: mail.id })}
                        />
                        <div className="mm-mail-body">
                            <div className="mm-mail-header">
                <span className="mm-mail-from">
                  {mail.from?.emailAddress?.name || mail.from?.emailAddress?.address || "Unknown"}
                </span>
                                <span className="mm-mail-date">
                  {new Date(mail.receivedDateTime).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                            </div>
                            <div className="mm-mail-subject">{mail.subject || "(No Subject)"}</div>
                            <div className="mm-mail-preview">{mail.bodyPreview}</div>
                        </div>
                        <div className="mm-mail-meta">
                            {mail.importance === "high" && <span className="mm-tag urgent" title="High importance">!</span>}
                            {mail.hasAttachments && <span className="mm-tag">📎</span>}
                            {mail.flag?.flagStatus === "flagged" && <span className="mm-tag flagged">⚑ Flagged</span>}
                            {cl && (
                                <>
                  <span className={`mm-conf-badge ${confLevel(cl.confidence)}`}>
                    {Math.round(cl.confidence * 100)}% conf.
                  </span>
                                    <span title={cl.reasoning}
                                          className="mm-rule-label">{cl.matchedRule}</span>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function confLevel(c) { return c >= 0.8 ? "high" : c >= 0.5 ? "medium" : "low"; }