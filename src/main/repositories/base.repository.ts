import Database from 'better-sqlite3';
import { initDatabase } from '../db/connection';

export abstract class BaseRepository {
  protected get db(): Database.Database {
    return initDatabase();
  }
}
