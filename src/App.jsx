import {useState, useRef, useEffect} from "react";
import {AppProvider, useApp} from "./context/AppContext";
import {useMailClassifier} from "./hooks/useMailClassifier";
import {serialiseConfig, downloadConfigFile, readFileAsText, parseConfig} from "./services/configService";
import {decodeCredentials, authenticateROPC} from "./services/authService";
import MailList from "./components/MailList";
import RulesEditor from "./components/RulesEditor";
import ClassificationPanel from "./components/ClassificationPanel";
import Notifications from "./components/Notifications";

export default function App() {
    const [mode, setMode] = useState("light");
    useEffect(() => {
        document.body.classList.toggle("dark", mode === "dark");
    }, [mode]);
    return (
        <AppProvider>
            <MainApp mode={mode} setMode={setMode}/>
        </AppProvider>
    );
}

function MainApp({mode, setMode}) {
    const {state, dispatch, notify} = useApp();
    const {fetchMails, classifyAndAct} = useMailClassifier();
    const [activeTab, setActiveTab] = useState("mails");
    const [showConnect, setShowConnect] = useState(false);

    /* ── Export current settings as JSON ── */
    const handleExport = () => {
        const json = serialiseConfig({
            credentialsBase64: state.credentialsBase64 || "",
            llmsuite: state.llmsuite || {baseUrl: "", apiKey: "", model: "gpt-4o"},
            rules: state.rules,
        });
        downloadConfigFile(json, "mailmind-config.json");
        notify("Settings exported as JSON", "success");
    };

    /* ── Import JSON (same file they exported) ── */
    const handleImport = async (file) => {
        if (!file) return;
        try {
            const text = await readFileAsText(file);
            const config = parseConfig(text);
            dispatch({
                type: "LOAD_CONFIG",
                credentialsBase64: config.credentials,
                llmsuite: config.llmsuite,
                rules: config.rules,
            });
            // If credentials present, auto-connect
            if (config.credentials) {
                try {
                    const creds = decodeCredentials(config.credentials);
                    const tokenData = await authenticateROPC(creds);
                    dispatch({
                        type: "SET_TOKEN",
                        accessToken: tokenData.accessToken,
                        refreshToken: tokenData.refreshToken,
                        expiresAt: tokenData.expiresAt,
                        username: tokenData.username
                    });
                    notify(`Connected as ${creds.username}`, "success");
                } catch {
                    notify("Settings loaded — credentials invalid, please reconnect", "warning");
                }
            } else {
                notify("Settings imported successfully", "success");
            }
        } catch (err) {
            notify(`Import failed: ${err.message}`, "error");
        }
    };

    const TABS = [
        {id: "mails", icon: "✉", label: "Inbox", count: state.mails.length, muted: false},
        {id: "rules", icon: "⚙", label: "Rules", count: state.rules.filter((r) => r.enabled).length, muted: true},
        {id: "results", icon: "◎", label: "Results", count: Object.keys(state.classifications).length, muted: false},
        {id: "settings", icon: "≡", label: "Settings", count: 0, muted: true},
    ];

    const isConnected = !!state.accessToken;

    return (
        <div className="mm-shell">

            {/* ══ SIDEBAR ══ */}
            <aside className="mm-sidebar">
                <div className="mm-logo">
                    <div className="mm-logo-mark">✉</div>
                    <span className="mm-logo-text">MailMind</span>
                </div>

                <nav className="mm-nav">
                    {TABS.map((t) => (
                        <button key={t.id} className={`mm-nav-btn${activeTab === t.id ? " active" : ""}`}
                                onClick={() => setActiveTab(t.id)}>
                            <span className="mm-nav-icon">{t.icon}</span>
                            <span className="mm-nav-label">{t.label}</span>
                            {t.count > 0 && <span className={`mm-nav-badge${t.muted ? " muted" : ""}`}>{t.count}</span>}
                        </button>
                    ))}
                </nav>

                <div className="mm-sidebar-footer">
                    {/* User / connection status */}
                    <div className="mm-user">
                        <div className={`mm-avatar${isConnected ? "" : " empty"}`}>
                            {isConnected ? (state.userDisplayName?.[0]?.toUpperCase() || "U") : "?"}
                        </div>
                        <div className="mm-user-info">
                            {isConnected ? (
                                <>
                                    <div className="mm-user-name">{state.userDisplayName}</div>
                                    <div className="mm-user-sub">● connected</div>
                                </>
                            ) : (
                                <div className="mm-user-disconnected">Not connected</div>
                            )}
                        </div>
                    </div>

                    {isConnected && (
                        <button className="mm-footer-btn danger"
                                onClick={() => {
                                    dispatch({type: "CLEAR_TOKEN"});
                                    notify("Disconnected", "info");
                                }}>
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
            {activeTab === "mails" && "Inbox"}
              {activeTab === "rules" && "Classification Rules"}
              {activeTab === "results" && "Classification Results"}
              {activeTab === "settings" && "Settings"}
          </span>
                    {state.lastFetched &&
                        <span className="mm-synced">synced {state.lastFetched.toLocaleTimeString()}</span>}
                </div>

                <div className="mm-topbar-right">
                    {activeTab === "mails" && isConnected && <>
                        <button className="mm-btn mm-btn-outline" onClick={fetchMails} disabled={state.mailsLoading}>
                            {state.mailsLoading ? "Syncing…" : "↻ Sync"}
                        </button>
                        <button className="mm-btn mm-btn-primary" onClick={() => classifyAndAct()}
                                disabled={state.classifying || state.selectedMails.size === 0}>
                            {state.classifying
                                ? `Classifying${state.classificationProgress ? ` ${state.classificationProgress.processed}/${state.classificationProgress.total}` : "…"}`
                                : `⚡ Classify (${state.selectedMails.size})`}
                        </button>
                    </>}

                    {/* Connect button — always visible top-right */}
                    <button
                        className={`mm-connect-btn${isConnected ? " connected" : ""}`}
                        onClick={() => setShowConnect(true)}
                    >
                        {isConnected ? "● Connected" : "Connect"}
                    </button>
                </div>
            </header>

            {/* ══ CONTENT ══ */}
            <div className="mm-content">
                {activeTab === "mails" && <MailList/>}
                {activeTab === "rules" && <RulesEditor/>}
                {activeTab === "results" && <ClassificationPanel/>}
                {activeTab === "settings" && <SettingsPanel onExport={handleExport} onImport={handleImport}/>}
            </div>

            {/* ══ CONNECT MODAL ══ */}
            {showConnect && <ConnectModal onClose={() => setShowConnect(false)}/>}

            <Notifications/>
        </div>
    );
}

/* ── Connect Modal ────────────────────────────────── */
function ConnectModal({onClose}) {
    const {state, dispatch, notify} = useApp();
    const [form, setForm] = useState({
        username: "", password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPwd, setShowPwd] = useState(false);

    const set = (k) => (e) => setForm((f) => ({...f, [k]: e.target.value}));

    const handleConnect = async () => {
        if (!form.username || !form.password) {
            setError("Username, password are required.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const tokenData = await authenticateROPC({
                username: form.username, password: form.password,
            });

            // Store base64-encoded credentials for future export
            const credentialsBase64 = btoa(JSON.stringify({
                username: form.username, password: form.password,
            }));
            notify(`Connected as ${form.username}`, "success");
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Close on backdrop click
    const onBackdrop = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="mm-overlay" onClick={onBackdrop}>
            <div className="mm-modal">
                <div className="mm-modal-header">
                    <span className="mm-modal-title">Connect to Outlook & LLMSuite</span>
                    <button className="mm-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="mm-modal-body">
                    <div className="mm-field">
                        <label className="mm-label">Username (SID)</label>
                        <input className="mm-input" type="email" placeholder="ASIAPAC/I123123"
                               value={form.username} onChange={set("username")} autoFocus/>
                    </div>

                    <div className="mm-field">
                        <label className="mm-label">Password</label>
                        <div style={{position: "relative"}}>
                            <input className="mm-input" type={showPwd ? "text" : "password"} placeholder="••••••••"
                                   value={form.password} onChange={set("password")}
                                   style={{paddingRight: 44}}/>
                            <button onClick={() => setShowPwd(v => !v)}
                                    style={{
                                        position: "absolute",
                                        right: 10,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "var(--text3)",
                                        fontSize: 12
                                    }}>
                                {showPwd ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                    {error && (
                        <div style={{
                            display: "flex",
                            gap: 8,
                            padding: "10px 12px",
                            background: "rgba(220,38,38,0.07)",
                            border: "1px solid rgba(220,38,38,0.25)",
                            borderRadius: "var(--radius)",
                            fontSize: 12.5,
                            color: "var(--error)"
                        }}>
                            <span>⚠</span><span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="mm-modal-footer">
                    <button className="mm-btn mm-btn-outline" onClick={onClose}>Cancel</button>
                    <button className="mm-btn mm-btn-primary" onClick={handleConnect} disabled={loading}>
                        {loading ? "Connecting…" : "Connect"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Settings Panel ───────────────────────────────── */
function SettingsPanel({onExport, onImport}) {
    const {state, notify} = useApp();
    const importRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onImport(file);
            e.target.value = "";
        }
    };

    return (
        <div className="mm-settings">

            {/* Config file */}
            <div className="mm-settings-section">
                <div className="mm-settings-section-header">📁 Config File</div>
                <div className="mm-settings-section-body">
                    <p style={{fontSize: 13, color: "var(--text2)", lineHeight: 1.6}}>
                        Export your current rules, credentials and LLMSuite settings as a JSON file.
                        Import the same file next time to restore everything instantly.
                    </p>
                    <div style={{display: "flex", gap: 10}}>
                        <button className="mm-btn mm-btn-primary" onClick={onExport}>↓ Export settings</button>
                        <button className="mm-btn mm-btn-outline" onClick={() => importRef.current?.click()}>↑ Import
                            settings
                        </button>
                        <input ref={importRef} type="file" accept=".json" style={{display: "none"}}
                               onChange={handleFileChange}/>
                    </div>

                    <details style={{marginTop: 4}}>
                        <summary style={{fontSize: 12, color: "var(--text3)", cursor: "pointer", userSelect: "none"}}>
                            What's in the exported file?
                        </summary>
                        <pre className="mm-code-block"
                             style={{marginTop: 8, borderRadius: "var(--radius)", fontSize: 10.5}}>{`{
  "credentials": "<base64>",   // username, password for ROPC auth (not recommended, but convenient for quick setup)
  "rules": [
    { "id": "rule_1", "name": "...", "condition": "...", "action": "...", "enabled": true }
  ]
}`}</pre>
                    </details>
                </div>
            </div>

            {/* Connection status */}
            <div className="mm-settings-section">
                <div className="mm-settings-section-header">🔌 Connection Status</div>
                <div className="mm-settings-section-body">
                    <div className="mm-settings-row">
                        <div>
                            <div className="mm-settings-label">Microsoft Graph API</div>
                            <div className="mm-settings-sub">{state.userDisplayName || "Not connected"}</div>
                        </div>
                        <span style={{
                            fontSize: 12,
                            color: state.accessToken ? "var(--success)" : "var(--error)",
                            fontWeight: 600
                        }}>
              {state.accessToken ? "● Connected" : "○ Disconnected"}
            </span>
                    </div>
                    <div className="mm-settings-row">
                        <div>
                            <div className="mm-settings-label">LLMSuite</div>
                            <div className="mm-settings-sub">{state.llmsuite?.baseUrl || "Not configured"}</div>
                        </div>
                        <span style={{
                            fontSize: 12,
                            color: state.llmsuite?.apiKey ? "var(--success)" : "var(--error)",
                            fontWeight: 600
                        }}>
              {state.llmsuite?.apiKey ? "● Configured" : "○ Not set"}
            </span>
                    </div>
                    {state.tokenExpiresAt && (
                        <div style={{fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)"}}>
                            Token expires: {new Date(state.tokenExpiresAt).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Azure note */}
            <div className="mm-settings-section">
                <div className="mm-settings-section-header">ℹ Azure App Registration Note</div>
                <div className="mm-settings-section-body">
                    <p style={{fontSize: 12.5, color: "var(--text2)", lineHeight: 1.65}}>
                        ROPC (password grant) requires <strong>"Allow public client flows"</strong> to be
                        enabled on your Azure App Registration under <em>Authentication → Advanced settings</em>.
                        Required Graph permissions: <code style={{fontFamily: "var(--mono)", fontSize: 11}}>Mail.Read,
                        Mail.ReadWrite, User.Read, MailboxSettings.Read</code>.
                        MFA-enabled accounts are not supported by ROPC.
                    </p>
                </div>
            </div>

        </div>
    );
}