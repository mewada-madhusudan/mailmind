import { useCallback, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { fetchMailsFromFolder, fetchFullFolderTree, fetchMailBody, sanitizeMailForLLM, applyClassificationActions, markMailRead, flagMail, moveMail, deleteMail } from "../services/graphService";
import { classifyMails } from "../services/llmService";
import { refreshAccessToken } from "../services/authService";

export function useMailClassifier() {
  const { state, dispatch, notify } = useApp();
  const refreshingRef = useRef(false);
  const autoSyncRef = useRef(null);

  // ── Token management ─────────────────────────────────────────────────────
  const getToken = useCallback(async () => {
    if (!state.accessToken) throw new Error("Not connected — click Connect first.");
    const needsRefresh = state.tokenExpiresAt && Date.now() > state.tokenExpiresAt;
    if (!needsRefresh) return state.accessToken;
    if (!state.refreshToken) throw new Error("Session expired — please reconnect.");
    if (refreshingRef.current) { await new Promise(r => setTimeout(r, 800)); return state.accessToken; }
    refreshingRef.current = true;
    try {
      const data = await refreshAccessToken({ refreshToken: state.refreshToken, clientId: state.llmsuite?._clientId, tenantId: state.llmsuite?._tenantId });
      dispatch({ type: "SET_TOKEN", ...data });
      return data.accessToken;
    } finally { refreshingRef.current = false; }
  }, [state.accessToken, state.refreshToken, state.tokenExpiresAt, state.llmsuite, dispatch]);

  // ── Load full folder tree ────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    dispatch({ type: "SET_FOLDERS_LOADING", loading: true });
    try {
      const token = await getToken();
      const folders = await fetchFullFolderTree(token);
      dispatch({ type: "SET_FOLDERS", folders });
    } catch (err) {
      dispatch({ type: "SET_FOLDERS_LOADING", loading: false });
      notify(`Failed to load folders: ${err.message}`, "error");
    }
  }, [getToken, dispatch, notify]);

  // ── Fetch mails for active folder ────────────────────────────────────────
  const fetchMails = useCallback(async (folderId, opts = {}) => {
    const folder = folderId || state.activeFolderId || "inbox";
    dispatch({ type: "SET_MAILS_LOADING", loading: true });
    try {
      const token = await getToken();
      const mails = await fetchMailsFromFolder(token, folder, { showUnreadOnly: state.showUnreadOnly, ...opts });
      dispatch({ type: "SET_MAILS", mails });
    } catch (err) {
      dispatch({ type: "SET_MAILS_ERROR", error: err.message });
      notify(`Fetch failed: ${err.message}`, "error");
    }
  }, [getToken, state.activeFolderId, state.showUnreadOnly, dispatch, notify]);

  // ── Open mail in read pane ───────────────────────────────────────────────
  const openMail = useCallback(async (mailId) => {
    dispatch({ type: "SET_ACTIVE_MAIL", id: mailId });
    // Mark as read in state immediately
    dispatch({ type: "UPDATE_MAIL", id: mailId, patch: { isRead: true } });
    try {
      const token = await getToken();
      const body = await fetchMailBody(token, mailId);
      dispatch({ type: "SET_MAIL_BODY", body });
      // Mark read on server silently
      await markMailRead(token, mailId, true).catch(() => {});
      // Update unread count in folders
      await loadFolders().catch(() => {});
    } catch (err) {
      notify(`Could not load email body: ${err.message}`, "error");
    }
  }, [getToken, dispatch, notify, loadFolders]);

  // ── Bulk actions (no LLM) ────────────────────────────────────────────────
  const bulkAction = useCallback(async (action, mailIds, extra = {}) => {
    if (!mailIds?.length) return;
    try {
      const token = await getToken();
      let successCount = 0;
      for (const id of mailIds) {
        try {
          if (action === "markRead")    { await markMailRead(token, id, true);         dispatch({ type: "UPDATE_MAIL", id, patch: { isRead: true } }); }
          if (action === "markUnread")  { await markMailRead(token, id, false);        dispatch({ type: "UPDATE_MAIL", id, patch: { isRead: false } }); }
          if (action === "flag")        { await flagMail(token, id, "flagged");        dispatch({ type: "UPDATE_MAIL", id, patch: { flag: { flagStatus: "flagged" } } }); }
          if (action === "unflag")      { await flagMail(token, id, "notFlagged");     dispatch({ type: "UPDATE_MAIL", id, patch: { flag: { flagStatus: "notFlagged" } } }); }
          if (action === "delete")      { await deleteMail(token, id);                 }
          if (action === "move" && extra.folderId) { await moveMail(token, id, extra.folderId); }
          successCount++;
        } catch { /* continue */ }
      }
      if (action === "delete" || action === "move") dispatch({ type: "REMOVE_MAILS", ids: mailIds });
      dispatch({ type: "CLEAR_SELECTION" });
      notify(`${successCount} email${successCount !== 1 ? "s" : ""} ${action === "markRead" ? "marked read" : action === "markUnread" ? "marked unread" : action + "d"}`, "success");
      await loadFolders().catch(() => {});
    } catch (err) {
      notify(`Action failed: ${err.message}`, "error");
    }
  }, [getToken, dispatch, notify, loadFolders]);

  // ── Classify + act ───────────────────────────────────────────────────────
  const classifyAndAct = useCallback(async (mailIds = null) => {
    const targetIds = mailIds || Array.from(state.selectedMails);
    if (!targetIds.length) { notify("No emails selected", "warning"); return; }
    const enabledRules = state.rules.filter(r => r.enabled);
    if (!enabledRules.length) { notify("No enabled rules — add rules first", "warning"); return; }
    dispatch({ type: "SET_CLASSIFYING", classifying: true });
    try {
      const token = await getToken();
      const targetMails = state.mails.filter(m => targetIds.includes(m.id));
      const sanitized = targetMails.map(sanitizeMailForLLM);
      notify(`Classifying ${sanitized.length} email${sanitized.length !== 1 ? "s" : ""}…`, "info");
      const classifications = await classifyMails(sanitized, enabledRules, {
        llmsuite: state.llmsuite,
        onProgress: p => dispatch({ type: "SET_CLASSIFICATION_PROGRESS", progress: p }),
      });
      const classMap = Object.fromEntries(classifications.map(c => [c.messageId, c]));
      dispatch({ type: "SET_CLASSIFICATIONS", classifications: classMap });

      const actions = classifications.flatMap(c => (c.actions || []).map(a => ({ messageId: c.messageId, ...a })));
      if (!actions.length) { notify("Classification complete — no actions needed", "success"); return; }

      notify(`Applying ${actions.length} action${actions.length !== 1 ? "s" : ""}…`, "info");
      const results = await applyClassificationActions(token, actions);
      dispatch({ type: "SET_ACTION_RESULTS", results });

      // Record analytics
      const ts = new Date().toISOString();
      const entries = classifications.map(c => ({ ts, rule: c.matchedRule, confidence: c.confidence, actions: (c.actions || []).map(a => a.action) }));
      dispatch({ type: "APPEND_ANALYTICS", entries });

      const ok = results.filter(r => r.success).length;
      const fail = results.length - ok;
      notify(`Done — ${ok} action${ok !== 1 ? "s" : ""} applied${fail > 0 ? `, ${fail} failed` : ""}`, fail > 0 ? "warning" : "success");
      await fetchMails();
      await loadFolders().catch(() => {});
    } catch (err) {
      dispatch({ type: "SET_CLASSIFYING", classifying: false });
      notify(`Error: ${err.message}`, "error");
    }
  }, [state.selectedMails, state.mails, state.rules, state.llmsuite, getToken, dispatch, notify, fetchMails, loadFolders]);

  // ── Auto-sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoSyncRef.current) { clearInterval(autoSyncRef.current); autoSyncRef.current = null; }
    if (state.autoSyncEnabled && state.accessToken) {
      autoSyncRef.current = setInterval(() => {
        fetchMails().catch(() => {});
      }, state.autoSyncIntervalMin * 60 * 1000);
    }
    return () => { if (autoSyncRef.current) clearInterval(autoSyncRef.current); };
  }, [state.autoSyncEnabled, state.autoSyncIntervalMin, state.accessToken, fetchMails]);

  return { fetchMails, loadFolders, openMail, bulkAction, classifyAndAct };
}