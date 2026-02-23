// hooks/useMailClassifier.js — uses ROPC token + auto-refresh
import { useCallback, useRef } from "react";
import { useApp } from "../context/AppContext";
import { fetchNewMails, sanitizeMailForLLM, applyClassificationActions, getMailFolders } from "../services/graphService";
import { classifyMails } from "../services/llmService";
import { refreshAccessToken } from "../services/authService";

export function useMailClassifier() {
  const { state, dispatch, notify } = useApp();
  // Prevent concurrent refresh calls
  const refreshingRef = useRef(false);

  // ── Ensure token is valid, refresh if needed ─────────────────────────────
  const getValidToken = useCallback(async () => {
    if (!state.accessToken) throw new Error("Not authenticated — please reload config.");

    const needsRefresh = state.tokenExpiresAt && Date.now() > state.tokenExpiresAt;
    if (!needsRefresh) return state.accessToken;

    if (!state.refreshToken) throw new Error("Session expired — please reload the config file.");

    if (refreshingRef.current) {
      // Wait briefly if a refresh is already in progress
      await new Promise((r) => setTimeout(r, 800));
      return state.accessToken;
    }

    refreshingRef.current = true;
    try {
      const { accessToken, refreshToken, expiresAt } = await refreshAccessToken({
        refreshToken: state.refreshToken,
        clientId: state.llmsuite?._clientId, // stored at load time
        tenantId: state.llmsuite?._tenantId,
      });
      dispatch({ type: "SET_TOKEN", accessToken, refreshToken, expiresAt });
      return accessToken;
    } finally {
      refreshingRef.current = false;
    }
  }, [state.accessToken, state.refreshToken, state.tokenExpiresAt, state.llmsuite, dispatch]);

  // ── Fetch mails ──────────────────────────────────────────────────────────
  const fetchMails = useCallback(async () => {
    dispatch({ type: "SET_MAILS_LOADING", loading: true });
    try {
      const token = await getValidToken();
      const [mails, folders] = await Promise.all([
        fetchNewMails(token),
        getMailFolders(token),
      ]);
      dispatch({ type: "SET_MAILS", mails });
      dispatch({ type: "SET_FOLDERS", folders });
      notify(`Fetched ${mails.length} unread email${mails.length !== 1 ? "s" : ""}`, "success");
    } catch (err) {
      dispatch({ type: "SET_MAILS_ERROR", error: err.message });
      notify(`Fetch failed: ${err.message}`, "error");
    }
  }, [getValidToken, dispatch, notify]);

  // ── Classify → act ───────────────────────────────────────────────────────
  const classifyAndAct = useCallback(async (mailIds = null) => {
    const targetIds = mailIds || Array.from(state.selectedMails);
    if (targetIds.length === 0) { notify("No emails selected", "warning"); return; }

    const enabledRules = state.rules.filter((r) => r.enabled);
    if (enabledRules.length === 0) { notify("No classification rules enabled", "warning"); return; }

    dispatch({ type: "SET_CLASSIFYING", classifying: true });
    try {
      const token = await getValidToken();
      const targetMails = state.mails.filter((m) => targetIds.includes(m.id));
      const sanitized = targetMails.map(sanitizeMailForLLM);

      notify(`Classifying ${sanitized.length} email${sanitized.length !== 1 ? "s" : ""}…`, "info");

      const classifications = await classifyMails(sanitized, enabledRules, {
        llmsuite: state.llmsuite,
        onProgress: (p) => dispatch({ type: "SET_CLASSIFICATION_PROGRESS", progress: p }),
      });

      const classMap = Object.fromEntries(classifications.map((c) => [c.messageId, c]));
      dispatch({ type: "SET_CLASSIFICATIONS", classifications: classMap });

      const actions = classifications.flatMap((c) =>
          (c.actions || []).map((a) => ({ messageId: c.messageId, ...a }))
      );

      if (actions.length === 0) {
        notify("Classification complete — no actions needed", "success");
        return;
      }

      notify(`Applying ${actions.length} action${actions.length !== 1 ? "s" : ""} to Outlook…`, "info");
      const results = await applyClassificationActions(token, actions);
      dispatch({ type: "SET_ACTION_RESULTS", results });

      const ok = results.filter((r) => r.success).length;
      const fail = results.length - ok;
      notify(`Done — ${ok} action${ok !== 1 ? "s" : ""} applied${fail > 0 ? `, ${fail} failed` : ""}`, fail > 0 ? "warning" : "success");

      await fetchMails();
    } catch (err) {
      dispatch({ type: "SET_CLASSIFYING", classifying: false });
      notify(`Error: ${err.message}`, "error");
    }
  }, [state.selectedMails, state.mails, state.rules, state.llmsuite, getValidToken, dispatch, notify, fetchMails]);

  return { fetchMails, classifyAndAct };
}