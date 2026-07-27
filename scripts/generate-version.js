const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const versionFilePath = path.join(projectDir, 'lib', 'version.json');

const date = new Date();
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

const versionStr = `verzia ${year}.${month}.${day}.${hour}.${minute}`;

fs.writeFileSync(versionFilePath, JSON.stringify({ version: versionStr }, null, 2));
console.log(`Generated version: ${versionStr} -> ${versionFilePath}`);
