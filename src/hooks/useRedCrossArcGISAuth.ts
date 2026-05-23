import { useEffect, useSyncExternalStore } from "react";
import { checkRedCrossArcGISSignIn, ensureRedCrossOAuth, signInToRedCrossArcGIS } from "../utils/arcgisOAuth";

export type ArcGISAuthStatus = "idle" | "checking" | "signed-out" | "signing-in" | "signed-in" | "error";

export type ArcGISAuthState = {
  status: ArcGISAuthStatus;
  userId: string;
  error: string;
};

const listeners = new Set<() => void>();
let authState: ArcGISAuthState = {
  status: "idle",
  userId: "",
  error: ""
};
let checkPromise: Promise<void> | undefined;
let signInPromise: Promise<void> | undefined;

function getErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : "";

  if (/aborted/i.test(message)) return "ArcGIS sign-in was closed or blocked before it completed.";
  return message || "ArcGIS sign-in did not complete.";
}

function setAuthState(nextState: Partial<ArcGISAuthState>) {
  authState = { ...authState, ...nextState };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return authState;
}

export function checkArcGISAuthSession() {
  if (authState.status === "signed-in") return Promise.resolve();
  if (checkPromise) return checkPromise;

  ensureRedCrossOAuth();
  setAuthState({ status: "checking", error: "" });
  checkPromise = checkRedCrossArcGISSignIn()
    .then((credential) => {
      setAuthState({
        status: "signed-in",
        userId: credential.userId ?? "Red Cross ArcGIS",
        error: ""
      });
    })
    .catch(() => {
      setAuthState({ status: "signed-out", userId: "", error: "" });
    })
    .finally(() => {
      checkPromise = undefined;
    });

  return checkPromise;
}

export function signInArcGISSession() {
  if (authState.status === "signed-in") return Promise.resolve();
  if (signInPromise) return signInPromise;

  ensureRedCrossOAuth();
  setAuthState({ status: "signing-in", error: "" });
  signInPromise = signInToRedCrossArcGIS()
    .then((credential) => {
      setAuthState({
        status: "signed-in",
        userId: credential.userId ?? "Red Cross ArcGIS",
        error: ""
      });
    })
    .catch((error) => {
      const message = getErrorMessage(error);
      setAuthState({ status: "error", userId: "", error: message });
      throw error;
    })
    .finally(() => {
      signInPromise = undefined;
    });

  return signInPromise;
}

export function useRedCrossArcGISAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (state.status === "idle") {
      void checkArcGISAuthSession();
    }
  }, [state.status]);

  return {
    ...state,
    isAuthenticated: state.status === "signed-in",
    signIn: signInArcGISSession,
    refresh: checkArcGISAuthSession
  };
}
