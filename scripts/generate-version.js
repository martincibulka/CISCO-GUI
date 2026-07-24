const fs = require('fs');
const path = require('path');

function getLatestMtime(dir) {
  let maxMtime = 0;
  
  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
      if (['node_modules', '.next', '.git', 'database.sqlite'].includes(file)) {
        continue;
      }
      const fullPath = path.join(currentDir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (/\.(js|jsx|css|json|mjs)$/.test(file) && file !== 'version.json') {
          if (stat.mtimeMs > maxMtime) {
            maxMtime = stat.mtimeMs;
          }
        }
      } catch (err) {
        // Ignore files we cannot access
      }
    }
  }

  try {
    walk(dir);
  } catch (e) {
    console.error('Error walking directory for version:', e);
  }
  
  return maxMtime;
}

const projectDir = path.resolve(__dirname, '..');
const latestTimeMs = getLatestMtime(projectDir);

let versionStr = 'verzia 0.0.0';
if (latestTimeMs > 0) {
  const date = new Date(latestTimeMs);
  
  // Format specifically in Slovak timezone (Europe/Bratislava)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Bratislava',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  let hour = parts.find(p => p.type === 'hour').value;
  if (hour === '24') hour = '00';
  const minute = parts.find(p => p.type === 'minute').value;
  
  versionStr = `verzia ${year}.${month}.${day}.${hour}.${minute}`;
}

const versionFilePath = path.join(projectDir, 'lib', 'version.json');
fs.writeFileSync(versionFilePath, JSON.stringify({ version: versionStr }, null, 2));
console.log(`Generated version: ${versionStr} -> ${versionFilePath}`);
