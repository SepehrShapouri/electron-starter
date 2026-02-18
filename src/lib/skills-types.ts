export type SkillsStatusConfigCheck = {
  path: string;
  satisfied: boolean;
};

export type SkillInstallOption = {
  id: string;
  kind: string;
  label: string;
  bins: string[];
};

export type SkillRequirements = {
  bins: string[];
  env: string[];
  config: string[];
  os: string[];
};

export type SkillStatusEntry = {
  name: string;
  description: string;
  source: string;
  filePath: string;
  baseDir: string;
  skillKey: string;
  bundled?: boolean;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  always: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  eligible: boolean;
  requirements?: SkillRequirements;
  missing?: SkillRequirements;
  configChecks?: SkillsStatusConfigCheck[];
  install?: SkillInstallOption[];
};

export type SkillStatusReport = {
  workspaceDir: string;
  managedSkillsDir: string;
  skills: SkillStatusEntry[];
};

export type SkillsInstallParams = {
  name: string;
  installId: string;
  timeoutMs?: number;
};

export type SkillsInstallResult = {
  ok?: boolean;
  message?: string;
};

export type SkillsUpdateParams = {
  skillKey: string;
  enabled: boolean;
};
