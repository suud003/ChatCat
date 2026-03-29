const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

const csPath = path.join(__dirname, 'fgwindow.cs');
const exePath = path.join(os.tmpdir(), 'chatcat-fgwindow2.exe');
const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';

const cmd = `"${cscPath}" /nologo /out:"${exePath}" "${csPath}"`;
console.log('Compiling:', cmd);

try {
  const result = execSync(cmd, { encoding: 'utf8', shell: 'cmd.exe' });
  console.log('Success:', result);
  console.log('Output:', exePath);
} catch (err) {
  console.error('Failed:', err.stdout || err.message);
}
