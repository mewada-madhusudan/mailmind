import { useState, useRef, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { useMailClassifier } from "./hooks/useMailClassifier";
import { serialiseConfig, downloadConfigFile, readFileAsText, parseConfig } from "./services/configService";
import { decodeCredentials, authenticateROPC } from "./services/authService";
import FolderTree from "./components/FolderTree";
import MailList from "./components/MailList";
import RulesEditor from "./components/RulesEditor";
import ClassificationPanel from "./components/ClassificationPanel";
import Analytics from "./components/Analytics";
import Notifications from "./components/Notifications";

export default function App() {
    const [mode, setMode] = useState("light");
    useEffect(() => { document.body.classList.toggle("dark", mode === "dark"); }, [mode]);
    return <AppProvider><MainApp mode={mode} setMode={setMode} /></AppProvider>;
}

function MainApp({ mode, setMode }) {
    const { state, dispatch, notify } = useApp();
    const { fetchMails, loadFolders } = useMailClassifier();
    const [activeTab, setActiveTab] = useState("mails");
    const [showConnect, setShowConnect] = useState(false);
    const isConnected = !!state.accessToken;

    // When connected, load folders automatically
    useEffect(() => {
        if (isConnected && !state.folders.length && !state.foldersLoading) {
            loadFolders();
        }
    }, [isConnected]); // eslint-disable-line

    const handleExport = () => {
        const json = serialiseConfig({
            credentialsBase64: state.credentialsBase64 || "",
            llmsuite: state.llmsuite || { baseUrl: "", apiKey: "", model: "gpt-4o" },
            rules: state.rules,
        });
        downloadConfigFile(json, "mailmind-config.json");
        notify("Settings exported", "success");
    };

    const handleImport = async (file) => {
        if (!file) return;
        try {
            const text = await readFileAsText(file);
            const config = parseConfig(text);
            dispatch({ type: "LOAD_CONFIG", credentialsBase64: config.credentials, llmsuite: config.llmsuite, rules: config.rules });
            if (config.credentials) {
                try {
                    const creds = decodeCredentials(config.credentials);
                    const tok = await authenticateROPC(creds);
                    dispatch({ type: "SET_TOKEN", accessToken: tok.accessToken, refreshToken: tok.refreshToken, expiresAt: tok.expiresAt, username: tok.username });
                    notify(`Connected as ${creds.username}`, "success");
                } catch { notify("Settings loaded — please reconnect", "warning"); }
            } else {
                notify("Settings imported", "success");
            }
        } catch (err) { notify(`Import failed: ${err.message}`, "error"); }
    };

    const TABS = [
        { id: "mails",     icon: "✉", label: "Mail"       },
        { id: "rules",     icon: "⚙", label: "Rules",     badge: state.rules.filter(r => r.enabled).length, muted: true },
        { id: "results",   icon: "◎", label: "Results",   badge: Object.keys(state.classifications).length },
        { id: "analytics", icon: "📊", label: "Analytics"  },
        { id: "settings",  icon: "≡", label: "Settings"   },
    ];

    // Active folder name for topbar
    const activeFolder = state.folders.find(f => f.id === state.activeFolderId);

    return (
        <div className="mm-shell">

            {/* ══ SIDEBAR ══ */}
            <aside className="mm-sidebar">
                <div className="mm-logo">
                    <div className="mm-logo-mark">✉</div>
                    <span className="mm-logo-text">MailMind</span>
                </div>

                {/* Top nav tabs */}
                <div className="mm-nav mm-nav-top">
                    {TABS.map(t => (
                        <button key={t.id} className={`mm-nav-btn${activeTab === t.id ? " active" : ""}`}
                                onClick={() => setActiveTab(t.id)}>
                            <span className="mm-nav-icon">{t.icon}</span>
                            <span className="mm-nav-label">{t.label}</span>
                            {t.badge > 0 && <span className={`mm-nav-badge${t.muted ? " muted" : ""}`}>{t.badge}</span>}
                        </button>
                    ))}
                </div>

                {/* Folder tree — only show when on Mail tab and connected */}
                {activeTab === "mails" && isConnected && (
                    <>
                        <div className="mm-sidebar-section-label">Folders</div>
                        <div className="mm-folder-scroll">
                            <FolderTree />
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="mm-sidebar-footer">
                    <div className="mm-user">
                        <div className={`mm-avatar${isConnected ? "" : " empty"}`}>
                            {isConnected ? (state.userDisplayName?.[0]?.toUpperCase() || "U") : "?"}
                        </div>
                        <div className="mm-user-info">
                            {isConnected
                                ? <><div className="mm-user-name">{state.userDisplayName}</div><div className="mm-user-sub">● connected</div></>
                                : <div className="mm-user-disconnected">Not connected</div>}
                        </div>
                    </div>

                    {isConnected && (
                        <button className="mm-footer-btn danger"
                                onClick={() => { dispatch({ type: "CLEAR_TOKEN" }); notify("Disconnected", "info"); }}>
                            Logout
                        </button>
                    )}
                    <button className="mm-footer-btn" onClick={() => setMode(m => m === "light" ? "dark" : "light")}>
                        {mode === "light" ? "☾ Dark mode" : "☀ Light mode"}
                    </button>
                </div>
            </aside>

            {/* ══ TOPBAR ══ */}
            <header className="mm-topbar">
                <div className="mm-topbar-left">
          <span className="mm-page-title">
            {activeTab === "mails" && (activeFolder?.displayName || "Mail")}
              {activeTab === "rules" && "Rules"}
              {activeTab === "results" && "Results"}
              {activeTab === "analytics" && "Analytics"}
              {activeTab === "settings" && "Settings"}
          </span>
                    {state.lastFetched && <span className="mm-synced">synced {state.lastFetched.toLocaleTimeString()}</span>}
                    {state.autoSyncEnabled && <span className="mm-autosync-badge">⟳ auto</span>}
                </div>

                <div className="mm-topbar-right">
                    {activeTab === "mails" && isConnected && <>
                        <button className="mm-btn mm-btn-outline" onClick={() => fetchMails()} disabled={state.mailsLoading}>
                            {state.mailsLoading ? "Syncing…" : "↻ Sync"}
                        </button>
                    </>}
                    {activeTab === "settings" && <>
                        <button className="mm-btn mm-btn-outline" onClick={handleExport}>↓ Export</button>
                    </>}
                    <button className={`mm-connect-btn${isConnected ? " connected" : ""}`} onClick={() => setShowConnect(true)}>
                        {isConnected ? "● Connected" : "Connect"}
                    </button>
                </div>
            </header>

            {/* ══ CONTENT ══ */}
            <div className="mm-content">
                {activeTab === "mails"     && <MailList />}
                {activeTab === "rules"     && <RulesEditor />}
                {activeTab === "results"   && <ClassificationPanel />}
                {activeTab === "analytics" && <Analytics />}
                {activeTab === "settings"  && <SettingsPanel onExport={handleExport} onImport={handleImport} />}
            </div>

            {showConnect && <ConnectModal onClose={() => setShowConnect(false)} onConnected={loadFolders} />}
            <Notifications />
        </div>
    );
}

/* ── Connect Modal ──────────────────────────────────────────────────────── */
function ConnectModal({ onClose, onConnected }) {
    const { state, dispatch, notify } = useApp();
    const [form, setForm] = useState({
        username: "", password: "",
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "",
        tenantId: import.meta.env.VITE_AZURE_TENANT_ID || "",
        llmBaseUrl: state.llmsuite?.baseUrl || import.meta.env.VITE_LLMSUITE_BASE_URL || "",
        llmApiKey:  state.llmsuite?.apiKey  || import.meta.env.VITE_LLMSUITE_API_KEY  || "",
        llmModel:   state.llmsuite?.model   || "gpt-4o",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState(null);
    const [showPwd, setShowPwd] = useState(false);
    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleConnect = async () => {
        if (!form.username || !form.password || !form.clientId || !form.tenantId) { setError("All Microsoft fields are required."); return; }
        if (!form.llmBaseUrl || !form.llmApiKey) { setError("LLMSuite URL and API key are required."); return; }
        setLoading(true); setError(null);
        try {
            const tok = await authenticateROPC({ username: form.username, password: form.password, clientId: form.clientId, tenantId: form.tenantId });
            const credentialsBase64 = btoa(JSON.stringify({ username: form.username, password: form.password, clientId: form.clientId, tenantId: form.tenantId }));
            dispatch({ type: "LOAD_CONFIG", credentialsBase64, llmsuite: { baseUrl: form.llmBaseUrl, apiKey: form.llmApiKey, model: form.llmModel, _clientId: form.clientId, _tenantId: form.tenantId }, rules: state.rules });
            dispatch({ type: "SET_TOKEN", accessToken: tok.accessToken, refreshToken: tok.refreshToken, expiresAt: tok.expiresAt, username: tok.username });
            notify(`Connected as ${form.username}`, "success");
            onClose();
            setTimeout(() => onConnected?.(), 200);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="mm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="mm-modal">
                <div className="mm-modal-header">
                    <span className="mm-modal-title">Connect</span>
                    <button className="mm-modal-close" onClick={onClose}>×</button>
                </div>
                <div className="mm-modal-body">
                    <div className="mm-modal-section-label">Microsoft Graph (ROPC)</div>
                    <div className="mm-field">
                        <label className="mm-label">Username</label>
                        <input className="mm-input" type="email" placeholder="user@company.com" value={form.username} onChange={set("username")} autoFocus />
                    </div>
                    <div className="mm-field">
                        <label className="mm-label">Password</label>
                        <div style={{ position:"relative" }}>
                            <input className="mm-input" type={showPwd ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={set("password")} style={{ paddingRight:48 }} />
                            <button onClick={() => setShowPwd(v => !v)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text3)", fontSize:11 }}>
                                {showPwd ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        <div className="mm-field"><label className="mm-label">Client ID</label><input className="mm-input" placeholder="xxxxxxxx-…" value={form.clientId} onChange={set("clientId")} /></div>
                        <div className="mm-field"><label className="mm-label">Tenant ID</label><input className="mm-input" placeholder="xxxxxxxx-…" value={form.tenantId} onChange={set("tenantId")} /></div>
                    </div>
                    <div className="mm-divider">LLMSuite</div>
                    <div className="mm-field"><label className="mm-label">Base URL</label><input className="mm-input" type="url" placeholder="https://…/v1" value={form.llmBaseUrl} onChange={set("llmBaseUrl")} /></div>
                    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10 }}>
                        <div className="mm-field"><label className="mm-label">API Key</label><input className="mm-input" type="password" placeholder="sk-…" value={form.llmApiKey} onChange={set("llmApiKey")} /></div>
                        <div className="mm-field"><label className="mm-label">Model</label><input className="mm-input" placeholder="gpt-4o" value={form.llmModel} onChange={set("llmModel")} /></div>
                    </div>
                    {error && <div style={{ display:"flex", gap:8, padding:"10px 12px", background:"rgba(220,38,38,0.07)", border:"1px solid rgba(220,38,38,0.25)", borderRadius:"var(--radius)", fontSize:12.5, color:"var(--error)" }}><span>⚠</span><span>{error}</span></div>}
                </div>
                <div className="mm-modal-footer">
                    <button className="mm-btn mm-btn-outline" onClick={onClose}>Cancel</button>
                    <button className="mm-btn mm-btn-primary" onClick={handleConnect} disabled={loading}>{loading ? "Connecting…" : "Connect"}</button>
                </div>
            </div>
        </div>
    );
}

/* ── Settings Panel ─────────────────────────────────────────────────────── */
function SettingsPanel({ onExport, onImport }) {
    const { state, dispatch, notify } = useApp();
    const importRef = useRef(null);

    return (
        <div className="mm-settings">
            {/* Config */}
            <div className="mm-settings-section">
                <div className="mm-settings-section-header">📁 Config File</div>
                <div className="mm-settings-section-body">
                    <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6 }}>
                        Export all rules, credentials and LLMSuite settings to a JSON file. Import it next session to restore everything.
                    </p>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                        <button className="mm-btn mm-btn-primary" onClick={onExport}>↓ Export settings</button>
                        <button className="mm-btn mm-btn-outline" onClick={() => importRef.current?.click()}>↑ Import settings</button>
                        <input ref={importRef} type="file" accept=".json" style={{ display:"none" }} onChange={e => { onImport(e.target.files[0]); e.target.value=""; }} />
                    </div>
                </div>
            </div>

            {/* Auto-sync */}
            <div className="mm-settings-section">
                <div className="mm-settings-section-header">⟳ Auto Sync</div>
                <div className="mm-settings-section-body">
                    <div className="mm-settings-row">
                        <div>
                            <div className="mm-settings-label">Auto-sync mail</div>
                            <div className="mm-settings-sub">Automatically fetch new emails at interval</div>
                        </div>
                        <label className="mm-toggle">
                            <input type="checkbox" checked={state.autoSyncEnabled}
                                   onChange={e => dispatch({ type: "SET_AUTOSYNC", enabled: e.target.checked, intervalMin: state.autoSyncIntervalMin })} />
                            <span className="mm-toggle-track"><span className="mm-toggle-thumb" /></span>
                        </label>
                    </div>
                    {state.autoSyncEnabled && (
                        <div className="mm-settings-row">
                            <div className="mm-settings-label">Interval (minutes)</div>
                            <select className="mm-input" style={{ width:100 }} value={state.autoSyncIntervalMin}
                                    onChange={e => dispatch({ type: "SET_AUTOSYNC", enabled: true, intervalMin: +e.target.value })}>
                                {[1,2,5,10,15,30].map(v => <option key={v} value={v}>{v} min</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Status */}
            <div className="mm-settings-section">
                <div className="mm-settings-section-header">🔌 Connection Status</div>
                <div className="mm-settings-section-body">
                    <div className="mm-settings-row">
                        <div><div className="mm-settings-label">Microsoft Graph</div><div className="mm-settings-sub">{state.userDisplayName || "—"}</div></div>
                        <span style={{ fontSize:12, color: state.accessToken ? "var(--success)" : "var(--error)", fontWeight:600 }}>{state.accessToken ? "● Connected" : "○ Disconnected"}</span>
                    </div>
                    <div className="mm-settings-row">
                        <div><div className="mm-settings-label">LLMSuite</div><div className="mm-settings-sub">{state.llmsuite?.baseUrl || "—"}</div></div>
                        <span style={{ fontSize:12, color: state.llmsuite?.apiKey ? "var(--success)" : "var(--error)", fontWeight:600 }}>{state.llmsuite?.apiKey ? "● Set" : "○ Not set"}</span>
                    </div>
                    {state.tokenExpiresAt && (
                        <div style={{ fontSize:11, color:"var(--text3)", fontFamily:"var(--mono)" }}>
                            Token expires: {new Date(state.tokenExpiresAt).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Azure note */}
            <div className="mm-settings-section">
                <div className="mm-settings-section-header">ℹ Azure Requirements</div>
                <div className="mm-settings-section-body">
                    <p style={{ fontSize:12.5, color:"var(--text2)", lineHeight:1.65 }}>
                        Enable <strong>"Allow public client flows"</strong> on your Azure App Registration under
                        Authentication → Advanced. Required Graph permissions:&nbsp;
                        <code style={{ fontFamily:"var(--mono)", fontSize:11 }}>Mail.Read · Mail.ReadWrite · User.Read · MailboxSettings.Read</code>.
                        MFA-enabled accounts are not supported.
                    </p>
                </div>
            </div>
        </div>
    );
}