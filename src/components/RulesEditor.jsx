// components/RulesEditor.jsx — Salt DS Button only, native form inputs
import { useState } from "react";

import { useApp } from "../context/AppContext";

const BLANK = { id: "", name: "", condition: "", action: "", enabled: true };

export default function RulesEditor() {
  const { state, dispatch, notify } = useApp();
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(BLANK);

  const save = () => {
    if (!draft.name.trim() || !draft.condition.trim() || !draft.action.trim()) {
      notify("Please fill in all fields", "warning");
      return;
    }
    const isNew = !draft.id;
    const rule = isNew ? { ...draft, id: `rule_${Date.now()}` } : draft;
    const updated = isNew ? [...state.rules, rule] : state.rules.map((r) => r.id === rule.id ? rule : r);
    dispatch({ type: "SET_RULES", rules: updated });
    notify(isNew ? "Rule added" : "Rule updated", "success");
    setEditing(null);
    setDraft(BLANK);
  };

  const del = (id) => { dispatch({ type: "SET_RULES", rules: state.rules.filter((r) => r.id !== id) }); notify("Rule deleted", "info"); };
  const toggle = (id) => dispatch({ type: "SET_RULES", rules: state.rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r) });
  const startEdit = (rule) => { setEditing(rule.id); setDraft({ ...rule }); };
  const cancel = () => { setEditing(null); setDraft(BLANK); };

  return (
      <div className="mm-rules">
        <div className="mm-rules-header">
          <p className="mm-rules-desc">
            Rules are sent as natural-language instructions to LLMSuite. Each rule has a
            condition (when to match) and an action (what to do in Outlook). Be specific for best results.
          </p>
          <button className="mm-btn mm-btn-primary" onClick={() => { setEditing("__new__"); setDraft(BLANK); }}>+ Add Rule</button>
        </div>

        {/* Form */}
        {editing && (
            <div className="mm-rule-form">
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {editing === "__new__" ? "New Rule" : "Edit Rule"}
              </p>

              <div className="mm-form-group">
                <label className="mm-form-label">Rule Name</label>
                <input className="mm-input" type="text" value={draft.name}
                       onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                       placeholder="e.g. Flag urgent emails" />
              </div>

              <div className="mm-form-group">
                <label className="mm-form-label">Condition <span className="mm-form-hint">— When should this rule apply?</span></label>
                <textarea className="mm-input mm-textarea" rows={3} value={draft.condition}
                          onChange={(e) => setDraft({ ...draft, condition: e.target.value })}
                          placeholder="e.g. Subject or body contains URGENT, ASAP, or critical deadline" />
              </div>

              <div className="mm-form-group">
                <label className="mm-form-label">Action <span className="mm-form-hint">— What should happen?</span></label>
                <textarea className="mm-input mm-textarea" rows={2} value={draft.action}
                          onChange={(e) => setDraft({ ...draft, action: e.target.value })}
                          placeholder="e.g. Flag the email, set importance to high, categorise as 'Urgent'" />
              </div>

              <div className="mm-form-actions">
                <button className="mm-btn mm-btn-secondary" onClick={cancel}>Cancel</button>
                <button className="mm-btn mm-btn-primary" onClick={save}>Save Rule</button>
              </div>
            </div>
        )}

        {/* List */}
        <div className="mm-rule-list">
          {state.rules.length === 0 && (
              <div className="mm-empty" style={{ padding: "30px 0" }}>
                <p>No rules yet — add your first rule above.</p>
              </div>
          )}
          {state.rules.map((rule) => (
              <div key={rule.id} className={`mm-rule-card ${!rule.enabled ? "disabled" : ""}`}>
                <div className="mm-rule-card-header">
                  {/* Native toggle */}
                  <label className="mm-toggle">
                    <input type="checkbox" checked={rule.enabled} onChange={() => toggle(rule.id)} />
                    <span className="mm-toggle-track"><span className="mm-toggle-thumb" /></span>
                  </label>
                  <span className="mm-rule-name">{rule.name}</span>
                  <div className="mm-rule-actions">
                    <button className="mm-btn mm-btn-secondary" style={{ fontSize: 12, padding: "3px 10px" }} onClick={() => startEdit(rule)}>Edit</button>
                    <button className="mm-btn mm-btn-secondary" style={{ fontSize: 12, padding: "3px 10px", color: "#dc2626", borderColor: "#dc2626" }} onClick={() => del(rule.id)}>Delete</button>
                  </div>
                </div>
                <div className="mm-rule-card-body">
                  <div className="mm-rule-field"><span className="mm-field-label">IF</span><span>{rule.condition}</span></div>
                  <div className="mm-rule-field"><span className="mm-field-label">THEN</span><span>{rule.action}</span></div>
                </div>
              </div>
          ))}
        </div>

        {/* Action reference */}
        <div className="mm-action-ref">
          <h3>Available Outlook Actions</h3>
          <div className="mm-action-grid">
            {[
              ["📁", "move",          "Move to folder (inbox / archive / junk / deleteditems)"],
              ["⚑",  "flag",          "Flag (flagged / notFlagged / complete)"],
              ["✓",  "markRead",      "Mark as read or unread"],
              ["🏷", "categorise",    "Apply Outlook colour categories"],
              ["!",  "setImportance", "Set importance: low / normal / high"],
              ["🗑", "delete",        "Move to Deleted Items"],
            ].map(([icon, name, desc]) => (
                <div key={name} className="mm-action-item">
                  <span>{icon}</span><code>{name}</code><span>{desc}</span>
                </div>
            ))}
          </div>
        </div>
      </div>
  );
}