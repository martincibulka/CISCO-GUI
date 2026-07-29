const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

const { loadEnvConfig } = require('@next/env');
loadEnvConfig(path.join(__dirname, '..'));

const localFiles = [
  { local: path.join(__dirname, '..', 'components', 'Pane.js'), remoteTemp: '/home/antigravity/Pane.js', remoteDest: '/home/spravca/cisco GUI/components/Pane.js' },
  { local: path.join(__dirname, '..', 'components', 'SettingsModal.js'), remoteTemp: '/home/antigravity/SettingsModal.js', remoteDest: '/home/spravca/cisco GUI/components/SettingsModal.js' },
  { local: path.join(__dirname, '..', 'components', 'MiddlePanel.js'), remoteTemp: '/home/antigravity/MiddlePanel.js', remoteDest: '/home/spravca/cisco GUI/components/MiddlePanel.js' },
  { local: path.join(__dirname, '..', 'lib', 'version.json'), remoteTemp: '/home/antigravity/version.json', remoteDest: '/home/spravca/cisco GUI/lib/version.json' },
  { local: path.join(__dirname, '..', 'scripts', 'generate-version.js'), remoteTemp: '/home/antigravity/generate-version.js', remoteDest: '/home/spravca/cisco GUI/scripts/generate-version.js' },
  { local: path.join(__dirname, '..', '.agents', 'AGENTS.md'), remoteTemp: '/home/antigravity/AGENTS.md', remoteDest: '/home/spravca/cisco GUI/.agents/AGENTS.md' }
];

async function main() {
  const host = process.env.DEPLOY_HOST;
  const username = process.env.DEPLOY_USER;
  const password = process.env.DEPLOY_PASS;

  if (!host || !username || !password) {
    console.error('Error: Missing DEPLOY_HOST, DEPLOY_USER or DEPLOY_PASS in .env.local');
    process.exit(1);
  }

  try {
    console.log(`Connecting to Ubuntu server (${host})...`);
    await ssh.connect({
      host,
      username,
      password
    });
    console.log('Connected successfully!');

    // 1. Upload files to temp location
    for (const file of localFiles) {
      console.log(`Uploading ${path.basename(file.local)} to temporary location...`);
      await ssh.putFile(file.local, file.remoteTemp);
    }
    console.log('All files uploaded to temporary location.');

    // 2. Move files using sudo to spravca's directory
    console.log('Moving files to destination directory with sudo...');
    const sudoPass = password;
    
    for (const file of localFiles) {
      console.log(`Moving ${path.basename(file.local)} to ${file.remoteDest}...`);
      const cmd = `echo "${sudoPass}" | sudo -S cp "${file.remoteTemp}" "${file.remoteDest}"`;
      const res = await ssh.execCommand(cmd);
      if (res.stderr && !res.stderr.includes('Password:')) {
        console.error(`Error moving file: ${res.stderr}`);
      }
    }

    // Fix permissions
    console.log('Fixing file ownership...');
    const chownCmd = `echo "${sudoPass}" | sudo -S chown -R spravca:spravca "/home/spravca/cisco GUI"`;
    await ssh.execCommand(chownCmd);

    // 3. Restart docker-compose
    console.log('Restarting docker container (down & up --build)...');
    const dockerCmd = `echo "${sudoPass}" | sudo -S docker -C "/home/spravca/cisco GUI" compose down && echo "${sudoPass}" | sudo -S docker -C "/home/spravca/cisco GUI" compose up --build -d`;
    
    console.log('Running docker-compose down and up...');
    // Note: docker compose command syntax, on some servers it is "docker compose" and some "docker-compose"
    // Let's run a check first or just run docker-compose
    const resDocker = await ssh.execCommand(`echo "${sudoPass}" | sudo -S sh -c 'cd "/home/spravca/cisco GUI" && docker-compose down && docker-compose up --build -d'`);
    console.log('Docker output:');
    console.log(resDocker.stdout || resDocker.stderr);

    // 4. Cleanup temp files
    console.log('Cleaning up temporary files...');
    for (const file of localFiles) {
      await ssh.execCommand(`rm -f "${file.remoteTemp}"`);
    }

    console.log('Deployment completed successfully!');
    ssh.dispose();
  } catch (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
  }
}

main();
