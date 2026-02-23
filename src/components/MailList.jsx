import { useApp } from "../context/AppContext";
import { useMailClassifier } from "../hooks/useMailClassifier";
import BulkActionsBar from "./BulkActionsBar";
import ReadPane from "./ReadPane";

export default function MailList() {
    const { state, dispatch } = useApp();
    const { openMail } = useMailClassifier();
    const { mails, mailsLoading, mailsError, selectedMails, activeMailId, showUnreadOnly } = state;

    const allSelected = mails.length > 0 && selectedMails.size === mails.length;
    const someSelected = selectedMails.size > 0 && !allSelected;

    if (mailsLoading && !mails.length) return (
        <div className="mm-empty"><div className="mm-spinner lg" /><p>Loading emails…</p></div>
    );
    if (mailsError) return (
        <div className="mm-empty"><span className="mm-empty-icon">⚠</span><p style={{ color:"var(--error)" }}>{mailsError}</p></div>
    );

    const activeFolder = state.folders.find(f => f.id === state.activeFolderId);

    return (
        <div className={`mm-mail-layout${activeMailId ? " with-pane" : ""}`}>

            {/* Mail list column */}
            <div className="mm-mail-col">
                {/* Toolbar */}
                <div className="mm-mail-toolbar">
                    <label className="mm-check-label">
                        <input type="checkbox" className="mm-checkbox" checked={allSelected}
                               ref={el => { if (el) el.indeterminate = someSelected; }}
                               onChange={() => dispatch({ type: allSelected ? "CLEAR_SELECTION" : "SELECT_ALL_MAILS" })} />
                        <span>{allSelected ? "Deselect all" : "Select all"}</span>
                    </label>

                    <span className="mm-select-count">{mails.length} email{mails.length !== 1 ? "s" : ""}</span>

                    <label className="mm-check-label" style={{ marginLeft: "auto" }}>
                        <input type="checkbox" className="mm-checkbox"
                               checked={showUnreadOnly}
                               onChange={e => dispatch({ type: "SET_UNREAD_ONLY", value: e.target.checked })} />
                        Unread only
                    </label>

                    {mailsLoading && <div className="mm-spinner" style={{ width:16, height:16, borderWidth:2 }} />}
                </div>

                {/* Bulk action bar */}
                <BulkActionsBar />

                {/* Empty state */}
                {!mails.length && !mailsLoading && (
                    <div className="mm-empty">
                        <span className="mm-empty-icon">✉</span>
                        <p>{activeFolder ? `No emails in ${activeFolder.displayName}` : "No emails"}</p>
                        <p className="sub">Select a folder and click Sync</p>
                    </div>
                )}

                {/* Rows */}
                {mails.map(mail => {
                    const cl = state.classifications[mail.id];
                    const isSelected = selectedMails.has(mail.id);
                    const isActive = activeMailId === mail.id;

                    return (
                        <div key={mail.id}
                             className={`mm-mail-row${isSelected ? " selected" : ""}${isActive ? " reading" : ""}${cl ? " classified" : ""}${!mail.isRead ? " unread" : ""}`}
                             onClick={() => openMail(mail.id)}
                        >
                            <div onClick={e => e.stopPropagation()}>
                                <input type="checkbox" className="mm-checkbox"
                                       checked={isSelected}
                                       onChange={() => dispatch({ type: "TOGGLE_MAIL_SELECTED", id: mail.id })} />
                            </div>

                            <div className="mm-mail-body">
                                <div className="mm-mail-header">
                                    <span className="mm-mail-from">{mail.from?.emailAddress?.name || mail.from?.emailAddress?.address || "Unknown"}</span>
                                    <span className="mm-mail-date">
                    {new Date(mail.receivedDateTime).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                                </div>
                                <div className="mm-mail-subject">{mail.subject || "(No Subject)"}</div>
                                <div className="mm-mail-preview">{mail.bodyPreview}</div>
                            </div>

                            <div className="mm-mail-meta">
                                {mail.importance === "high" && <span className="mm-tag urgent" title="High importance">!</span>}
                                {mail.hasAttachments && <span className="mm-tag">📎</span>}
                                {mail.flag?.flagStatus === "flagged" && <span className="mm-tag flagged">⚑</span>}
                                {cl && (
                                    <>
                    <span className={`mm-conf-badge ${cl.confidence >= 0.8 ? "high" : cl.confidence >= 0.5 ? "medium" : "low"}`}>
                      {Math.round(cl.confidence * 100)}%
                    </span>
                                        <span className="mm-rule-label" title={cl.reasoning}>{cl.matchedRule}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Read pane */}
            {activeMailId && <ReadPane />}
        </div>
    );
}