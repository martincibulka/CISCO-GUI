const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');

const host = '10.0.101.200';
const username = 'antigravity';
const password = 'Superheslo21';

// Folders/files to exclude from deployment
const excludes = [
  'node_modules',
  '.next',
  '.git',
  'database.sqlite',
  'deploy_temp'
];

function getFiles(dir, baseDir = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (excludes.includes(file)) return;
    const filePath = path.join(dir, file);
    const relativePath = path.relative(baseDir || dir, filePath).replace(/\\/g, '/');
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getFiles(filePath, baseDir || dir));
    } else {
      results.push(relativePath);
    }
  });
  return results;
}

const conn = new Client();

function executeCommand(conn, cmd, password, logPrefix = '') {
  return new Promise((resolve, reject) => {
    console.log(`${logPrefix}Executing: ${cmd}`);
    const stream = conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';

      stream.on('close', (code, signal) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        const msg = data.toString();
        stderr += msg;
        process.stderr.write(data);
        if (msg.toLowerCase().includes('password')) {
          stream.write(password + '\n');
        }
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('SSH connection established successfully.');

  try {
    const projectDir = path.resolve(__dirname, '..');
    const files = getFiles(projectDir);
    console.log(`Found ${files.length} files to upload.`);

    // 1. Create remote temp directories for all subfolders
    console.log('Creating remote directories...');
    const dirsToCreate = new Set();
    files.forEach(file => {
      const dir = path.dirname(file).replace(/\\/g, '/');
      if (dir && dir !== '.') {
        dirsToCreate.add(dir);
      }
    });

    // Run mkdir -p on remote server
    for (const dir of Array.from(dirsToCreate).sort()) {
      await executeCommand(conn, `mkdir -p ~/deploy_temp/${dir}`, password);
    }
    await executeCommand(conn, 'mkdir -p ~/deploy_temp', password);

    // 2. Start SFTP and upload all files
    console.log('Starting SFTP upload...');
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);

        let completed = 0;
        if (files.length === 0) return resolve();

        files.forEach(file => {
          const localPath = path.join(projectDir, file);
          const remotePath = `/home/antigravity/deploy_temp/${file}`;

          sftp.fastPut(localPath, remotePath, {}, (err) => {
            if (err) {
              console.error(`Failed to upload ${file}:`, err);
              return reject(err);
            }
            console.log(`Uploaded: ${file} -> ${remotePath}`);
            completed++;
            if (completed === files.length) {
              resolve();
            }
          });
        });
      });
    });

    console.log('All files uploaded to temp folder.');

    // 3. Copy files to /home/spravca/cisco GUI/ using sudo
    console.log('Copying files to target application directory...');
    const targetDir = '/home/spravca/cisco GUI';
    await executeCommand(
      conn,
      `sudo -S cp -r /home/antigravity/deploy_temp/* "${targetDir}/"`,
      password
    );

    // 4. Fix permissions
    console.log('Adjusting ownership to spravca...');
    await executeCommand(
      conn,
      `sudo -S chown -R spravca:spravca "${targetDir}"`,
      password
    );

    // 5. Rebuild and restart docker compose container
    console.log('Rebuilding and restarting docker compose containers...');
    await executeCommand(
      conn,
      `sudo -S sh -c 'cd "${targetDir}" && docker compose up --build -d --remove-orphans'`,
      password
    );

    // 6. Cleanup temp folder
    console.log('Cleaning up temporary files...');
    await executeCommand(conn, 'rm -rf ~/deploy_temp', password);

    console.log('\nDeployment completed successfully!');
    conn.end();
  } catch (err) {
    console.error('Error during deployment:', err);
    conn.end();
  }
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect({
  host,
  port: 22,
  username,
  password
});
