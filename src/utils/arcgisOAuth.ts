import OAuthInfo from "@arcgis/core/identity/OAuthInfo";
import esriId from "@arcgis/core/identity/IdentityManager";
import esriConfig from "@arcgis/core/config";
import { standaloneBiomedMapSource } from "../config/arcgisLayers";

export const redCrossSharingUrl = `${standaloneBiomedMapSource.portalUrl}/sharing`;
esriConfig.portalUrl = standaloneBiomedMapSource.portalUrl;

const arcgisOAuthAppId =
  (import.meta as ImportMeta & { env?: { VITE_ARCGIS_OAUTH_APP_ID?: string } }).env?.VITE_ARCGIS_OAUTH_APP_ID ??
  "3s32R5gBZAwRtMuT";
const configuredArcgisOAuthCallbackUrl = (import.meta as ImportMeta & {
  env?: { VITE_ARCGIS_OAUTH_REDIRECT_URI?: string };
}).env?.VITE_ARCGIS_OAUTH_REDIRECT_URI;

let redCrossOAuthRegistered = false;

function getArcgisOAuthCallbackUrl() {
  return configuredArcgisOAuthCallbackUrl ?? `${window.location.origin}/oauth-callback.html`;
}

export function ensureRedCrossOAuth() {
  if (redCrossOAuthRegistered) return;

  esriId.registerOAuthInfos([
    new OAuthInfo({
      appId: arcgisOAuthAppId,
      portalUrl: standaloneBiomedMapSource.portalUrl,
      popup: true,
      popupCallbackUrl: getArcgisOAuthCallbackUrl(),
      expiration: 20160
    })
  ]);
  redCrossOAuthRegistered = true;
}

export async function checkRedCrossArcGISSignIn() {
  ensureRedCrossOAuth();
  return esriId.checkSignInStatus(redCrossSharingUrl);
}

export async function signInToRedCrossArcGIS() {
  ensureRedCrossOAuth();
  return esriId.getCredential(redCrossSharingUrl, { oAuthPopupConfirmation: false });
}
