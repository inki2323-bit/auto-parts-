import { AppVersionConfig } from "../types";

export const CURRENT_APP_VERSION = "1.0.0";

/**
 * Compares two semantic version strings (e.g. "1.0.0" vs "1.1.0").
 * Returns:
 *   -1 if v1 < v2
 *    0 if v1 === v2
 *    1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  if (!v1) return -1;
  if (!v2) return 1;

  const clean = (v: string) => v.replace(/^v/i, "").trim();
  const parts1 = clean(v1).split(".").map((p) => parseInt(p, 10) || 0);
  const parts2 = clean(v2).split(".").map((p) => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export interface VersionCheckResult {
  hasUpdate: boolean;
  isForceUpdate: boolean;
  installedVersion: string;
  latestVersion: string;
  config: AppVersionConfig;
}

export function evaluateUpdateStatus(
  installedVersion: string,
  config: AppVersionConfig
): VersionCheckResult {
  const isNewerAvailable = compareVersions(installedVersion, config.latestVersion) < 0;
  const isBelowMinSupported = compareVersions(installedVersion, config.minimumSupportedVersion) < 0;
  const isForce = config.forceUpdate || isBelowMinSupported;

  return {
    hasUpdate: isNewerAvailable,
    isForceUpdate: isNewerAvailable && isForce,
    installedVersion,
    latestVersion: config.latestVersion,
    config,
  };
}
