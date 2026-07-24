const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

async function addUser() {
  const dbPath = path.join(__dirname, 'database.sqlite');
  console.log("Opening database at", dbPath);
  
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  const username = 'user';
  const password = 'user';
  const hash = await bcrypt.hash(password, 10);

  try {
    await db.run('INSERT INTO app_users (username, password_hash) VALUES (?, ?)', [username, hash]);
    console.log(`User '${username}' added successfully.`);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log(`User '${username}' already exists. Updating password.`);
      await db.run('UPDATE app_users SET password_hash = ? WHERE username = ?', [hash, username]);
      console.log(`User '${username}' password updated successfully.`);
    } else {
      console.error("Error adding user:", error);
    }
  }

  await db.close();
}

addUser();
