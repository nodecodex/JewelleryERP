import { BaseRepository } from './base.repository';
import type { User } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class UserRepository extends BaseRepository {
  public getUsers(companyId: string): User[] {
    return this.db.prepare(`
      SELECT id, company_id, username, role, permissions_json, created_at, updated_at 
      FROM users 
      WHERE company_id = ? 
      ORDER BY username ASC
    `).all(companyId) as User[];
  }

  public createUser(user: Omit<User, 'id'> & { password_plain: string }): User {
    const id = crypto.randomUUID();
    const hash = crypto.createHash('sha256').update(user.password_plain).digest('hex');
    const permissions = user.permissions_json || '{}';

    this.db.prepare(`
      INSERT INTO users (id, company_id, username, password_hash, role, permissions_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user.company_id, user.username, hash, user.role, permissions);

    return this.db.prepare('SELECT id, company_id, username, role, permissions_json, created_at, updated_at FROM users WHERE id = ?').get(id) as User;
  }

  public updateUserPermissions(id: string, permissionsJson: string): void {
    this.db.prepare('UPDATE users SET permissions_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(permissionsJson, id);
  }

  public updateUserPassword(id: string, oldPasswordPlain: string, newPasswordPlain: string): { success: boolean; message: string } {
    const user = this.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id) as { password_hash: string } | undefined;
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const oldHash = crypto.createHash('sha256').update(oldPasswordPlain).digest('hex');
    if (user.password_hash !== oldHash) {
      return { success: false, message: 'Old password verification failed.' };
    }

    const newHash = crypto.createHash('sha256').update(newPasswordPlain).digest('hex');
    this.db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, id);
    return { success: true, message: 'User password updated successfully.' };
  }

  public deleteUser(id: string): void {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}
