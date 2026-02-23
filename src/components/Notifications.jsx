// components/Notifications.jsx — Salt DS version
import { useApp } from "../context/AppContext";

const ICONS = { success: "✓", error: "✗", warning: "⚠", info: "ℹ" };

export default function Notifications() {
    const { state, dispatch } = useApp();

    return (
        <div className="mm-notifications">
            {state.notifications.map((n) => (
                <div key={n.id} className={`mm-notif ${n.type}`}>
                    <span className="mm-notif-icon">{ICONS[n.type]}</span>
                    <span className="mm-notif-msg">{n.message}</span>
                    <button
                        className="mm-notif-close"
                        onClick={() => dispatch({ type: "REMOVE_NOTIFICATION", id: n.id })}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}