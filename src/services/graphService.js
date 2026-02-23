// services/graphService.js
// All Microsoft Graph API interactions for mail fetching and manipulation

import { GRAPH_BASE } from "../authConfig";

/**
 * Fetches new/unread emails from Outlook via Graph API
 * Returns limited fields to avoid sending sensitive data to LLM
 */
export async function fetchNewMails(accessToken, options = {}) {
  const {
    top = 50,
    filter = "isRead eq false",
    select = "id,subject,from,receivedDateTime,bodyPreview,importance,categories,hasAttachments,flag",
    orderby = "receivedDateTime desc",
  } = options;

  const params = new URLSearchParams({
    $top: top,
    $filter: filter,
    $select: select,
    $orderby: orderby,
  });

  const res = await graphFetch(`/me/messages?${params}`, accessToken);
  return res.value || [];
}

/**
 * Sanitize mail data before sending to LLM
 * Only passes non-sensitive fields
 */
export function sanitizeMailForLLM(mail) {
  return {
    id: mail.id,
    subject: mail.subject || "(No Subject)",
    from: mail.from?.emailAddress?.address || "unknown",
    fromName: mail.from?.emailAddress?.name || "",
    receivedDateTime: mail.receivedDateTime,
    bodyPreview: (mail.bodyPreview || "").substring(0, 500), // Limit preview
    importance: mail.importance,
    hasAttachments: mail.hasAttachments,
    existingCategories: mail.categories || [],
    currentFlag: mail.flag?.flagStatus || "notFlagged",
  };
}

/**
 * Move email to a specific folder
 * folderIdOrName: well-known name ('deleteditems', 'junk', 'inbox', etc.) or folder ID
 */
export async function moveMail(accessToken, messageId, destinationFolderId) {
  return graphFetch(`/me/messages/${messageId}/move`, accessToken, {
    method: "POST",
    body: JSON.stringify({ destinationId: destinationFolderId }),
  });
}

/**
 * Mark email as read or unread
 */
export async function markMailRead(accessToken, messageId, isRead = true) {
  return graphFetch(`/me/messages/${messageId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ isRead }),
  });
}

/**
 * Flag or unflag an email
 * flagStatus: 'flagged' | 'notFlagged' | 'complete'
 */
export async function flagMail(accessToken, messageId, flagStatus = "flagged") {
  return graphFetch(`/me/messages/${messageId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ flag: { flagStatus } }),
  });
}

/**
 * Set email categories (colored categories in Outlook)
 */
export async function categoriseMail(accessToken, messageId, categories = []) {
  return graphFetch(`/me/messages/${messageId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ categories }),
  });
}

/**
 * Set email importance
 * importance: 'low' | 'normal' | 'high'
 */
export async function setImportance(accessToken, messageId, importance) {
  return graphFetch(`/me/messages/${messageId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ importance }),
  });
}

/**
 * Delete an email (move to Deleted Items)
 */
export async function deleteMail(accessToken, messageId) {
  return graphFetch(`/me/messages/${messageId}`, accessToken, {
    method: "DELETE",
  });
}

/**
 * Get all mail folders for the user
 */
export async function getMailFolders(accessToken) {
  const res = await graphFetch(
    "/me/mailFolders?$select=id,displayName,totalItemCount,unreadItemCount",
    accessToken
  );
  return res.value || [];
}

/**
 * Apply a batch of actions returned from LLM classification
 * actions: [{ messageId, action: 'move'|'flag'|'mark'|'categorise'|'delete', ...params }]
 */
export async function applyClassificationActions(accessToken, actions) {
  const results = [];
  for (const action of actions) {
    try {
      let result;
      switch (action.action) {
        case "move":
          result = await moveMail(accessToken, action.messageId, action.folderId);
          break;
        case "flag":
          result = await flagMail(accessToken, action.messageId, action.flagStatus || "flagged");
          break;
        case "markRead":
          result = await markMailRead(accessToken, action.messageId, action.isRead ?? true);
          break;
        case "categorise":
          result = await categoriseMail(accessToken, action.messageId, action.categories);
          break;
        case "setImportance":
          result = await setImportance(accessToken, action.messageId, action.importance);
          break;
        case "delete":
          result = await deleteMail(accessToken, action.messageId);
          break;
        default:
          result = { skipped: true, reason: `Unknown action: ${action.action}` };
      }
      results.push({ messageId: action.messageId, action: action.action, success: true, result });
    } catch (err) {
      results.push({ messageId: action.messageId, action: action.action, success: false, error: err.message });
    }
  }
  return results;
}

// ── Internal fetch helper ─────────────────────────────────────────────────────

async function graphFetch(path, accessToken, options = {}) {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) return null; // No content (DELETE)
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Graph API error: ${response.status}`);
  }
  return response.json();
}
