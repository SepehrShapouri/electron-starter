import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { PublisherGithub } from '@electron-forge/publisher-github';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const parseRepositoryCoordinates = (value: string) => {
  const trimmed = value.trim();

  const directMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (directMatch) {
    return {
      owner: directMatch[1],
      name: directMatch[2],
    };
  }

  const githubMatch = trimmed.match(
    /github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i
  );
  if (githubMatch) {
    return {
      owner: githubMatch[1],
      name: githubMatch[2],
    };
  }

  return null;
};

const readRepositoryFromPackageManifest = () => {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJsonRaw = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonRaw) as {
      clawpilot?: { updateRepository?: string };
      repository?: string | { url?: string };
    };

    if (
      packageJson.clawpilot &&
      typeof packageJson.clawpilot === 'object' &&
      typeof packageJson.clawpilot.updateRepository === 'string'
    ) {
      return parseRepositoryCoordinates(packageJson.clawpilot.updateRepository);
    }

    if (typeof packageJson.repository === 'string') {
      return parseRepositoryCoordinates(packageJson.repository);
    }

    if (
      packageJson.repository &&
      typeof packageJson.repository === 'object' &&
      typeof packageJson.repository.url === 'string'
    ) {
      return parseRepositoryCoordinates(packageJson.repository.url);
    }

    return null;
  } catch {
    return null;
  }
};

const updateRepositoryFromEnv =
  process.env.UPDATE_REPOSITORY ?? process.env.GITHUB_REPOSITORY ?? '';
const updateRepository =
  parseRepositoryCoordinates(updateRepositoryFromEnv) ??
  readRepositoryFromPackageManifest();
const updateRepositoryOwner = updateRepository?.owner ?? '';
const updateRepositoryName = updateRepository?.name ?? '';
const hasGitHubPublisherConfig =
  Boolean(updateRepositoryOwner) && Boolean(updateRepositoryName);
const appleId = process.env.APPLE_ID ?? '';
const appleIdPassword =
  process.env.APPLE_APP_SPECIFIC_PASSWORD ??
  process.env.APPLE_ID_PASSWORD ??
  '';
const appleTeamId = process.env.APPLE_TEAM_ID ?? '';
const hasNotarizeConfig =
  appleId.length > 0 && appleIdPassword.length > 0 && appleTeamId.length > 0;

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'clawpilot',
    icon: 'src/assets/Icon',
    osxSign: process.platform === 'darwin' ? true : undefined,
    osxNotarize:
      process.platform === 'darwin' && hasNotarizeConfig
        ? {
            appleId,
            appleIdPassword,
            teamId: appleTeamId,
          }
        : undefined,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerDMG({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: hasGitHubPublisherConfig
    ? [
        new PublisherGithub({
          repository: {
            owner: updateRepositoryOwner,
            name: updateRepositoryName,
          },
          draft: false,
          prerelease: false,
        }),
      ]
    : [],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
