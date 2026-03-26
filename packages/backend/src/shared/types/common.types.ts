export type UserRole = 'super_admin' | 'family_admin' | 'adult' | 'child';

export const USER_ROLES: Record<UserRole, UserRole> = {
  super_admin: 'super_admin',
  family_admin: 'family_admin',
  adult: 'adult',
  child: 'child',
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  family_admin: 3,
  adult: 2,
  child: 1,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export interface JwtPayload {
  sub: string;         // user_id
  email: string;
  role: UserRole;
  familyId: string;
  deviceId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
