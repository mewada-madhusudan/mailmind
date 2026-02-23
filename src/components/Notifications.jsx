// components/Notifications.jsx
import { useApp } from "../context/AppContext";

export default function Notifications() {
    const { state, dispatch } = useApp();

    return (
        <div className="notifications">
            {state.notifications.map((n) => (
                <div key={n.id} className={`notification notification-${n.type}`}>
          <span className="notification-icon">
            {n.type === "success" && "✓"}
              {n.type === "error" && "✗"}
              {n.type === "warning" && "⚠"}
              {n.type === "info" && "ℹ"}
          </span>
                    <span className="notification-msg">{n.message}</span>
                    <button
                        className="notification-close"
                        onClick={() => dispatch({ type: "REMOVE_NOTIFICATION", id: n.id })}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}