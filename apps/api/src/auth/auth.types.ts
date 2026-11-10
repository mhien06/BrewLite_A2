import { UserRole } from '../common/roles.decorator';

export interface AuthUser {
  sub: number;
  email: string;
  fullName: string;
  role: UserRole;
}
