import { useMemo } from "react";
import { useApp } from "../context/AppContext";

export default function Analytics() {
    const { state } = useApp();
    const data = state.analyticsData || [];

    const stats = useMemo(() => {
        if (!data.length) return null;

        // Rule hit counts
        const ruleCounts = {};
        const actionCounts = {};
        const confidenceBuckets = { high: 0, medium: 0, low: 0 };
        const byDay = {};

        for (const entry of data) {
            ruleCounts[entry.rule] = (ruleCounts[entry.rule] || 0) + 1;
            for (const a of entry.actions || []) {
                actionCounts[a] = (actionCounts[a] || 0) + 1;
            }
            if (entry.confidence >= 0.8) confidenceBuckets.high++;
            else if (entry.confidence >= 0.5) confidenceBuckets.medium++;
            else confidenceBuckets.low++;

            const day = entry.ts?.slice(0, 10) || "unknown";
            byDay[day] = (byDay[day] || 0) + 1;
        }

        return { ruleCounts, actionCounts, confidenceBuckets, byDay, total: data.length };
    }, [data]);

    const topRules = stats
        ? Object.entries(stats.ruleCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
        : [];

    const topActions = stats
        ? Object.entries(stats.actionCounts).sort((a, b) => b[1] - a[1])
        : [];

    const recentDays = stats
        ? Object.entries(stats.byDay).sort().slice(-7)
        : [];

    const maxDayCount = recentDays.length ? Math.max(...recentDays.map(d => d[1])) : 1;
    const maxRuleCount = topRules.length ? topRules[0][1] : 1;

    if (!data.length) {
        return (
            <div className="mm-empty">
                <span className="mm-empty-icon">📊</span>
                <p>No analytics data yet</p>
                <p className="sub">Run a classification to see stats here</p>
            </div>
        );
    }

    return (
        <div className="mm-analytics">

            {/* Summary cards */}
            <div className="mm-analytics-cards">
                <div className="mm-an-card">
                    <div className="mm-an-val">{stats.total}</div>
                    <div className="mm-an-label">Emails Classified</div>
                </div>
                <div className="mm-an-card">
                    <div className="mm-an-val">{Object.keys(stats.ruleCounts).length}</div>
                    <div className="mm-an-label">Rules Matched</div>
                </div>
                <div className="mm-an-card">
                    <div className="mm-an-val" style={{ color: "var(--success)" }}>{stats.confidenceBuckets.high}</div>
                    <div className="mm-an-label">High Confidence</div>
                </div>
                <div className="mm-an-card">
                    <div className="mm-an-val" style={{ color: "var(--error)" }}>{stats.confidenceBuckets.low}</div>
                    <div className="mm-an-label">Low Confidence</div>
                </div>
            </div>

            <div className="mm-analytics-grid">

                {/* Activity by day */}
                {recentDays.length > 0 && (
                    <div className="mm-an-section">
                        <h3 className="mm-an-title">Activity (last 7 days)</h3>
                        <div className="mm-bar-chart">
                            {recentDays.map(([day, count]) => (
                                <div key={day} className="mm-bar-col">
                                    <div className="mm-bar-track">
                                        <div className="mm-bar-fill" style={{ height: `${Math.round((count / maxDayCount) * 100)}%` }} />
                                    </div>
                                    <div className="mm-bar-label">{day.slice(5)}</div>
                                    <div className="mm-bar-val">{count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rule breakdown */}
                <div className="mm-an-section">
                    <h3 className="mm-an-title">Rule Hits</h3>
                    <div className="mm-hbar-list">
                        {topRules.map(([rule, count]) => (
                            <div key={rule} className="mm-hbar-row">
                                <div className="mm-hbar-name" title={rule}>{rule}</div>
                                <div className="mm-hbar-track">
                                    <div className="mm-hbar-fill" style={{ width: `${Math.round((count / maxRuleCount) * 100)}%` }} />
                                </div>
                                <div className="mm-hbar-count">{count}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions taken */}
                <div className="mm-an-section">
                    <h3 className="mm-an-title">Actions Applied</h3>
                    <div className="mm-action-counts">
                        {topActions.map(([action, count]) => (
                            <div key={action} className="mm-action-count-row">
                                <span className="mm-action-count-icon">{actionEmoji(action)}</span>
                                <span className="mm-action-count-name">{action}</span>
                                <span className="mm-action-count-val">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Confidence breakdown */}
                <div className="mm-an-section">
                    <h3 className="mm-an-title">Confidence Distribution</h3>
                    <div className="mm-conf-dist">
                        {[
                            { label: "High (≥80%)",   count: stats.confidenceBuckets.high,   cls: "high"   },
                            { label: "Medium (50–79%)",count: stats.confidenceBuckets.medium, cls: "medium" },
                            { label: "Low (<50%)",     count: stats.confidenceBuckets.low,    cls: "low"    },
                        ].map(b => {
                            const pct = stats.total ? Math.round((b.count / stats.total) * 100) : 0;
                            return (
                                <div key={b.label} className="mm-conf-row">
                                    <span className="mm-conf-label">{b.label}</span>
                                    <div className="mm-conf-track">
                                        <div className={`mm-conf-fill ${b.cls}`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="mm-conf-pct">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function actionEmoji(a) {
    return { move: "📁", flag: "⚑", markRead: "✓", categorise: "🏷", setImportance: "!", delete: "🗑" }[a] || "→";
}