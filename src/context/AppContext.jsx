import { createContext, useContext, useReducer, useCallback } from "react";

const AppContext = createContext(null);

const initialState = {
  // Config
  configLoaded: false,
  credentialsBase64: null,
  llmsuite: null,

  // Auth
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  userDisplayName: null,

  // Folders — flat array with depth, tree-expanded state
  folders: [],
  foldersLoading: false,
  expandedFolders: new Set(["inbox"]),  // folder IDs that are expanded
  activeFolderId: "inbox",
  showUnreadOnly: false,

  // Mails
  mails: [],
  selectedMails: new Set(),
  mailsLoading: false,
  mailsError: null,
  lastFetched: null,

  // Read pane
  activeMailId: null,       // ID of mail open in read pane
  activeMailBody: null,     // full body object
  bodyLoading: false,

  // Auto-sync
  autoSyncEnabled: false,
  autoSyncIntervalMin: 5,

  // Classification
  classifications: {},
  classifying: false,
  classificationProgress: null,
  actionResults: [],

  // Analytics
  analyticsData: [],        // array of { date, rule, count, action }

  // Rules
  rules: [],

  // Notifications
  notifications: [],
};

function reducer(state, action) {
  switch (action.type) {
      // Config
    case "LOAD_CONFIG":
      return { ...state, configLoaded: true, credentialsBase64: action.credentialsBase64, llmsuite: action.llmsuite, rules: action.rules };
    case "UNLOAD_CONFIG":
      return { ...initialState };

      // Auth
    case "SET_TOKEN":
      return { ...state, accessToken: action.accessToken, refreshToken: action.refreshToken ?? state.refreshToken, tokenExpiresAt: action.expiresAt, userDisplayName: action.username ?? state.userDisplayName };
    case "CLEAR_TOKEN":
      return { ...state, accessToken: null, refreshToken: null, tokenExpiresAt: null, userDisplayName: null };

      // Folders
    case "SET_FOLDERS_LOADING": return { ...state, foldersLoading: action.loading };
    case "SET_FOLDERS":         return { ...state, folders: action.folders, foldersLoading: false };
    case "SET_ACTIVE_FOLDER":   return { ...state, activeFolderId: action.id, mails: [], activeMailId: null, activeMailBody: null, selectedMails: new Set() };
    case "TOGGLE_FOLDER_EXPAND": {
      const next = new Set(state.expandedFolders);
      next.has(action.id) ? next.delete(action.id) : next.add(action.id);
      return { ...state, expandedFolders: next };
    }
    case "SET_UNREAD_ONLY": return { ...state, showUnreadOnly: action.value };

      // Mails
    case "SET_MAILS_LOADING": return { ...state, mailsLoading: action.loading, mailsError: null };
    case "SET_MAILS":         return { ...state, mails: action.mails, mailsLoading: false, lastFetched: new Date() };
    case "SET_MAILS_ERROR":   return { ...state, mailsError: action.error, mailsLoading: false };
    case "UPDATE_MAIL": {
      const mails = state.mails.map(m => m.id === action.id ? { ...m, ...action.patch } : m);
      return { ...state, mails };
    }
    case "REMOVE_MAILS": {
      const ids = new Set(action.ids);
      return { ...state, mails: state.mails.filter(m => !ids.has(m.id)), selectedMails: new Set([...state.selectedMails].filter(id => !ids.has(id))) };
    }

      // Selection
    case "TOGGLE_MAIL_SELECTED": {
      const next = new Set(state.selectedMails);
      next.has(action.id) ? next.delete(action.id) : next.add(action.id);
      return { ...state, selectedMails: next };
    }
    case "SELECT_ALL_MAILS":  return { ...state, selectedMails: new Set(state.mails.map(m => m.id)) };
    case "CLEAR_SELECTION":   return { ...state, selectedMails: new Set() };

      // Read pane
    case "SET_ACTIVE_MAIL":  return { ...state, activeMailId: action.id, activeMailBody: null, bodyLoading: true };
    case "SET_MAIL_BODY":    return { ...state, activeMailBody: action.body, bodyLoading: false };
    case "CLOSE_READ_PANE":  return { ...state, activeMailId: null, activeMailBody: null };

      // Auto-sync
    case "SET_AUTOSYNC": return { ...state, autoSyncEnabled: action.enabled, autoSyncIntervalMin: action.intervalMin ?? state.autoSyncIntervalMin };

      // Classification
    case "SET_CLASSIFYING":             return { ...state, classifying: action.classifying, classificationProgress: null };
    case "SET_CLASSIFICATION_PROGRESS": return { ...state, classificationProgress: action.progress };
    case "SET_CLASSIFICATIONS":         return { ...state, classifications: action.classifications, classifying: false, classificationProgress: null };
    case "SET_ACTION_RESULTS":          return { ...state, actionResults: action.results };
    case "APPEND_ANALYTICS": {
      const next = [...state.analyticsData, ...action.entries].slice(-500); // keep last 500
      return { ...state, analyticsData: next };
    }

      // Rules
    case "SET_RULES": return { ...state, rules: action.rules };

      // Notifications
    case "ADD_NOTIFICATION":    return { ...state, notifications: [...state.notifications, { id: Date.now(), ...action.notification }] };
    case "REMOVE_NOTIFICATION": return { ...state, notifications: state.notifications.filter(n => n.id !== action.id) };

    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const notify = useCallback((message, type = "info") => {
    const id = Date.now();
    dispatch({ type: "ADD_NOTIFICATION", notification: { message, type, id } });
    setTimeout(() => dispatch({ type: "REMOVE_NOTIFICATION", id }), 4500);
  }, []);

  return <AppContext.Provider value={{ state, dispatch, notify }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}