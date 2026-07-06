import { BaseRepository } from './base.repository';
import type { User } from '../../shared/ipc-api';
import * as crypto from 'crypto';
import argon2 from 'argon2';

export class UserRepository extends BaseRepository {
  public getUsers(companyId: string): User[] {
    return this.db.prepare(`
      SELECT id, company_id, username, role, permissions_json, created_at, updated_at 
      FROM users 
      WHERE company_id = ? 
      ORDER BY username ASC
    `).all(companyId) as User[];
  }

  public async createUser(user: Omit<User, 'id'> & { password_plain: string }): Promise<User> {
    const id = crypto.randomUUID();
    const permissions = user.permissions_json || '{}';
    const hash = await argon2.hash(user.password_plain);

    this.db.prepare(`
      INSERT INTO users (id, company_id, username, password_hash, role, permissions_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user.company_id, user.username, hash, user.role, permissions);

    return this.db.prepare('SELECT id, company_id, username, role, permissions_json, created_at, updated_at FROM users WHERE id = ?').get(id) as User;
  }

  public updateUserPermissions(id: string, permissionsJson: string): void {
    this.db.prepare('UPDATE users SET permissions_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(permissionsJson, id);
  }

  public async updateUserPassword(id: string, oldPasswordPlain: string, newPasswordPlain: string): Promise<{ success: boolean; message: string }> {
    const user = this.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id) as { password_hash: string } | undefined;
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const isValid = await argon2.verify(user.password_hash, oldPasswordPlain).catch(() => false);
    if (!isValid) {
      return { success: false, message: 'Old password verification failed.' };
    }

    const newHash = await argon2.hash(newPasswordPlain);
    this.db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, id);
    return { success: true, message: 'User password updated successfully.' };
  }

  public deleteUser(id: string): void {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}
