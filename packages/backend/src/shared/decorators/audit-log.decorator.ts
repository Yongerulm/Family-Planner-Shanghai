import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log_action';
export const AuditLog = (action: string) => SetMetadata(AUDIT_LOG_KEY, action);
