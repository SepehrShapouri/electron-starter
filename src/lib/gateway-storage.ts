const STORAGE_KEY = "clawpilot.gateway";

export type GatewayProfile = {
  gatewayUrl: string;
  gatewayToken: string;
  userId?: string | null;
  status?: string;
};

export function loadGatewayProfile(): GatewayProfile | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GatewayProfile;
  } catch {
    return null;
  }
}

export function saveGatewayProfile(profile: GatewayProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearGatewayProfile() {
  localStorage.removeItem(STORAGE_KEY);
}
