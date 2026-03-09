import type { GatewayConnectionConfig } from '@/lib/gateway/config';
import { withGatewayRequestClient } from '@/lib/gateway/request-client';
import type {
  SkillStatusReport,
  SkillsInstallParams,
  SkillsInstallResult,
  SkillsUpdateParams,
} from './skills-types';

export type { GatewayConnectionConfig } from '@/lib/gateway/config';

export async function getGatewaySkillsStatus(
  config: GatewayConnectionConfig
): Promise<SkillStatusReport> {
  return withGatewayRequestClient(config, async ({ client }) => {
    const payload = await client.request<SkillStatusReport>('skills.status', {});
    return payload;
  });
}

export async function installGatewaySkill(
  config: GatewayConnectionConfig,
  params: SkillsInstallParams
): Promise<SkillsInstallResult> {
  return withGatewayRequestClient(config, async ({ client }) => {
    const payload = await client.request<SkillsInstallResult>('skills.install', {
      name: params.name,
      installId: params.installId,
      timeoutMs: params.timeoutMs,
    });
    return payload ?? {};
  });
}

export async function updateGatewaySkillEnabled(
  config: GatewayConnectionConfig,
  params: SkillsUpdateParams
): Promise<void> {
  await withGatewayRequestClient(config, async ({ client }) => {
    await client.request('skills.update', {
      skillKey: params.skillKey,
      enabled: params.enabled,
    });
  });
}
