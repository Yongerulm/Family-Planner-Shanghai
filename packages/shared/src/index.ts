// ─── User Roles ──────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'family_admin' | 'adult' | 'child';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  family_admin: 3,
  adult: 2,
  child: 1,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;         // userId
  email: string;
  role: UserRole;
  familyId?: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

// ─── Common DTOs ─────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

// ─── Family ──────────────────────────────────────────────────────────────────

export interface FamilyMember {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  joinedAt: string;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ─── Gamification ────────────────────────────────────────────────────────────

export interface XpAwardEvent {
  userId: string;
  action: string;
  points: number;
  resourceId?: string;
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export interface SyncStatus {
  syncToken: string;
  pendingCount: number;
  lastSyncedAt: string | null;
}

// ─── App Versions ────────────────────────────────────────────────────────────

export const APP_MIN_VERSION = '1.0.0';

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
