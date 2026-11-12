const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function launchQaChrome() {
  const tempRoot = fs.realpathSync(os.tmpdir());
  const profile = fs.mkdtempSync(path.join(tempRoot, 'sugar-break-chrome-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=0',
    '--mute-audio',
    '--disable-component-update',
    '--disable-background-networking',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--allow-file-access-from-files',
    '--window-size=1440,1000',
    '--user-data-dir=' + profile,
    'about:blank',
  ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const closed = new Promise(resolve => chrome.once('close', resolve));

  async function close(socket) {
    const forceClose = setTimeout(() => chrome.kill(), 2000);
    try {
      if (socket?.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ id: 0, method: 'Browser.close' }));
        } catch {
          chrome.kill();
        }
      } else {
        chrome.kill();
      }
      await closed;
    } finally {
      clearTimeout(forceClose);
      socket?.close();
      const resolvedProfile = fs.realpathSync(profile);
      if (path.dirname(resolvedProfile) !== tempRoot ||
          !path.basename(resolvedProfile).startsWith('sugar-break-chrome-')) {
        throw new Error('Unexpected QA Chrome profile path: ' + resolvedProfile);
      }
      await fs.promises.rm(resolvedProfile, { recursive: true, maxRetries: 5, retryDelay: 100 });
    }
  }

  return { chrome, close };
}

module.exports = { launchQaChrome };
