import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.join(process.cwd(), 'database.sqlite');

let dbInstance = null;

export async function openDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    
    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS saved_switches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try { await dbInstance.exec('ALTER TABLE saved_switches ADD COLUMN username TEXT'); } catch(e){}
    try { await dbInstance.exec('ALTER TABLE saved_switches ADD COLUMN password TEXT'); } catch(e){}
    try { await dbInstance.exec('ALTER TABLE saved_switches ADD COLUMN enable_password TEXT'); } catch(e){}
    try { await dbInstance.exec('ALTER TABLE port_settings ADD COLUMN last_updated_by TEXT'); } catch(e){}
    try { await dbInstance.exec('ALTER TABLE port_settings ADD COLUMN status TEXT'); } catch(e){}

    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS app_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
      );
    `);

    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS port_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        switch_id INTEGER NOT NULL,
        port_name TEXT NOT NULL,
        description TEXT,
        status TEXT,
        vlan TEXT,
        port_security TEXT,
        mac_address TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(switch_id, port_name),
        FOREIGN KEY(switch_id) REFERENCES saved_switches(id) ON DELETE CASCADE
      );
    `);

    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS vlans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vlan_id INTEGER UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default VLANs if table is empty
    const vlanCount = await dbInstance.get('SELECT COUNT(*) as cnt FROM vlans');
    if (vlanCount.cnt === 0) {
      await dbInstance.exec(`
        INSERT OR IGNORE INTO vlans (vlan_id, name) VALUES
          (103, ''),
          (105, ''),
          (106, ''),
          (107, ''),
          (111, ''),
          (120, '');
      `);
    }

    const adminUser = await dbInstance.get('SELECT * FROM app_users WHERE username = ?', ['admin']);
    if (!adminUser) {
      const hash = await bcrypt.hash('admin', 10);
      await dbInstance.run('INSERT INTO app_users (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    }

    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS app_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);

    const roleCount = await dbInstance.get('SELECT COUNT(*) as cnt FROM app_roles');
    if (roleCount.cnt === 0) {
      await dbInstance.run("INSERT INTO app_roles (name) VALUES ('admin')");
      await dbInstance.run("INSERT INTO app_roles (name) VALUES ('používateľ')");
    }
  }
  return dbInstance;
}
