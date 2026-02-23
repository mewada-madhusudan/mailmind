// context/AppContext.jsx — No MSAL, credentials from JSON config
import { createContext, useContext, useReducer, useCallback } from "react";

const AppContext = createContext(null);

const initialState = {
  // Config / session
  configLoaded: false,
  credentialsBase64: null,   // raw base64 string kept for export
  llmsuite: null,            // { baseUrl, apiKey, model }

  // Auth (ROPC token)
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  userDisplayName: null,

  // Mails
  mails: [],
  selectedMails: new Set(),
  mailsLoading: false,
  mailsError: null,
  lastFetched: null,

  // Classification
  classifications: {},
  classifying: false,
  classificationProgress: null,
  actionResults: [],

  // Rules — loaded from config, editable in UI
  rules: [],

  // Folders
  folders: [],

  // UI
  notifications: [],
};

function reducer(state, action) {
  switch (action.type) {

      // ── Config load ────────────────────────────────────────────────────────
    case "LOAD_CONFIG":
      return {
        ...state,
        configLoaded: true,
        credentialsBase64: action.credentialsBase64,
        llmsuite: action.llmsuite,
        rules: action.rules,
      };

    case "UNLOAD_CONFIG":
      return { ...initialState };

      // ── Auth tokens ────────────────────────────────────────────────────────
    case "SET_TOKEN":
      return {
        ...state,
        accessToken: action.accessToken,
        refreshToken: action.refreshToken ?? state.refreshToken,
        tokenExpiresAt: action.expiresAt,
        userDisplayName: action.username ?? state.userDisplayName,
      };

    case "CLEAR_TOKEN":
      return { ...state, accessToken: null, refreshToken: null, tokenExpiresAt: null };

      // ── Mails ──────────────────────────────────────────────────────────────
    case "SET_MAILS_LOADING":
      return { ...state, mailsLoading: action.loading, mailsError: null };
    case "SET_MAILS":
      return { ...state, mails: action.mails, mailsLoading: false, lastFetched: new Date() };
    case "SET_MAILS_ERROR":
      return { ...state, mailsError: action.error, mailsLoading: false };

    case "TOGGLE_MAIL_SELECTED": {
      const next = new Set(state.selectedMails);
      next.has(action.id) ? next.delete(action.id) : next.add(action.id);
      return { ...state, selectedMails: next };
    }
    case "SELECT_ALL_MAILS":
      return { ...state, selectedMails: new Set(state.mails.map((m) => m.id)) };
    case "CLEAR_SELECTION":
      return { ...state, selectedMails: new Set() };

      // ── Classification ─────────────────────────────────────────────────────
    case "SET_CLASSIFYING":
      return { ...state, classifying: action.classifying, classificationProgress: null };
    case "SET_CLASSIFICATION_PROGRESS":
      return { ...state, classificationProgress: action.progress };
    case "SET_CLASSIFICATIONS":
      return { ...state, classifications: action.classifications, classifying: false, classificationProgress: null };
    case "SET_ACTION_RESULTS":
      return { ...state, actionResults: action.results };

      // ── Rules ──────────────────────────────────────────────────────────────
    case "SET_RULES":
      return { ...state, rules: action.rules };

      // ── Folders ────────────────────────────────────────────────────────────
    case "SET_FOLDERS":
      return { ...state, folders: action.folders };

      // ── Notifications ──────────────────────────────────────────────────────
    case "ADD_NOTIFICATION":
      return { ...state, notifications: [...state.notifications, { id: Date.now(), ...action.notification }] };
    case "REMOVE_NOTIFICATION":
      return { ...state, notifications: state.notifications.filter((n) => n.id !== action.id) };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const notify = useCallback((message, type = "info") => {
    const id = Date.now();
    dispatch({ type: "ADD_NOTIFICATION", notification: { message, type, id } });
    setTimeout(() => dispatch({ type: "REMOVE_NOTIFICATION", id }), 4500);
  }, []);

  return (
      <AppContext.Provider value={{ state, dispatch, notify }}>
        {children}
      </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}