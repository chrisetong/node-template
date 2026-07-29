import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA = 'audit:operation';

export type AuditMetadata = {
  action: string;
  resource: string;
};

export function Audit(action: string, resource: string) {
  return SetMetadata(AUDIT_METADATA, {
    action,
    resource,
  } satisfies AuditMetadata);
}
