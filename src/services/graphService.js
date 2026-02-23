import { GRAPH_BASE } from "../authConfig";

// ── Folder fetching ───────────────────────────────────────────────────────────

/** Fetch all top-level mail folders */
export async function getMailFolders(accessToken) {
  const res = await graphFetch(
      "/me/mailFolders?$select=id,displayName,totalItemCount,unreadItemCount,parentFolderId&$top=100",
      accessToken
  );
  return res.value || [];
}

/** Fetch child folders of a given folder */
export async function getChildFolders(accessToken, folderId) {
  const res = await graphFetch(
      `/me/mailFolders/${folderId}/childFolders?$select=id,displayName,totalItemCount,unreadItemCount,parentFolderId&$top=100`,
      accessToken
  );
  return res.value || [];
}

/**
 * Recursively fetch the full folder tree.
 * Returns flat array with depth metadata for rendering.
 */
export async function fetchFullFolderTree(accessToken) {
  const topLevel = await getMailFolders(accessToken);
  const result = [];

  async function expand(folders, depth) {
    for (const folder of folders) {
      result.push({ ...folder, depth });
      // Only expand folders that might have children (avoid API spam on empty folders)
      if (folder.totalItemCount > 0 || depth === 0) {
        try {
          const children = await getChildFolders(accessToken, folder.id);
          if (children.length > 0) await expand(children, depth + 1);
        } catch { /* skip if no access */ }
      }
    }
  }

  await expand(topLevel, 0);
  return result;
}

// ── Mail fetching ─────────────────────────────────────────────────────────────

/** Fetch mails from a specific folder */
export async function fetchMailsFromFolder(accessToken, folderId, options = {}) {
  const {
    top = 50,
    filter = "",
    select = "id,subject,from,receivedDateTime,bodyPreview,importance,categories,hasAttachments,flag,isRead",
    orderby = "receivedDateTime desc",
    showUnreadOnly = false,
  } = options;

  const params = new URLSearchParams({ $top: top, $select: select, $orderby: orderby });
  if (filter) params.set("$filter", filter);
  else if (showUnreadOnly) params.set("$filter", "isRead eq false");

  const endpoint = folderId === "allmail"
      ? `/me/messages?${params}`
      : `/me/mailFolders/${folderId}/messages?${params}`;

  const res = await graphFetch(endpoint, accessToken);
  return res.value || [];
}

/** Fetch the full body of a single message */
export async function fetchMailBody(accessToken, messageId) {
  const res = await graphFetch(
      `/me/messages/${messageId}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,importance,categories,hasAttachments,flag,isRead`,
      accessToken
  );
  return res;
}

/** Fetch new/unread mails (kept for backwards compat with classifier hook) */
export async function fetchNewMails(accessToken, folderId = "inbox", options = {}) {
  return fetchMailsFromFolder(accessToken, folderId, { ...options, showUnreadOnly: true });
}

// ── Sanitize for LLM ──────────────────────────────────────────────────────────

export function sanitizeMailForLLM(mail) {
  return {
    id: mail.id,
    subject: mail.subject || "(No Subject)",
    from: mail.from?.emailAddress?.address || "unknown",
    fromName: mail.from?.emailAddress?.name || "",
    receivedDateTime: mail.receivedDateTime,
    bodyPreview: (mail.bodyPreview || "").substring(0, 500),
    importance: mail.importance,
    hasAttachments: mail.hasAttachments,
    existingCategories: mail.categories || [],
    currentFlag: mail.flag?.flagStatus || "notFlagged",
    isRead: mail.isRead,
  };
}

// ── Mail actions ──────────────────────────────────────────────────────────────

export async function moveMail(accessToken, messageId, destinationFolderId) {
  return graphFetch(`/me/messages/${messageId}/move`, accessToken, {
    method: "POST",
    body: JSON.stringify({ destinationId: destinationFolderId }),
  });
}

export async function markMailRead(accessToken, messageId, isRead = true) {
  return graphFetch(`/me/messages/${messageId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ isRead }),
  });
}

export async function flagMail(accessToken, messageId, flagStatus = "flagged") {
  return graphFetch(`/me/messages/${messageId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ flag: { flagStatus } }),
  });
}

export async function categoriseMail(accessToken, messageId, categories = []) {
  return graphFetch(`/me/messages/${messageId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ categories }),
  });
}

export async function setImportance(accessToken, messageId, importance) {
  return graphFetch(`/me/messages/${messageId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ importance }),
  });
}

export async function deleteMail(accessToken, messageId) {
  return graphFetch(`/me/messages/${messageId}`, accessToken, { method: "DELETE" });
}

/** Batch apply actions from LLM classification results */
export async function applyClassificationActions(accessToken, actions) {
  const results = [];
  for (const action of actions) {
    try {
      let result;
      switch (action.action) {
        case "move":         result = await moveMail(accessToken, action.messageId, action.folderId); break;
        case "flag":         result = await flagMail(accessToken, action.messageId, action.flagStatus || "flagged"); break;
        case "markRead":     result = await markMailRead(accessToken, action.messageId, action.isRead ?? true); break;
        case "categorise":   result = await categoriseMail(accessToken, action.messageId, action.categories); break;
        case "setImportance":result = await setImportance(accessToken, action.messageId, action.importance); break;
        case "delete":       result = await deleteMail(accessToken, action.messageId); break;
        default:             result = { skipped: true };
      }
      results.push({ messageId: action.messageId, action: action.action, success: true, result });
    } catch (err) {
      results.push({ messageId: action.messageId, action: action.action, success: false, error: err.message });
    }
  }
  return results;
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function graphFetch(path, accessToken, options = {}) {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (response.status === 204) return null;
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Graph API error: ${response.status}`);
  }
  return response.json();
}