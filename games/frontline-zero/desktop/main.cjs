// Frontline Zero for PC: an Electron shell around the same game that runs in the browser.
// The game is served from an app:// origin (ES modules do not load from file://).
const { app, BrowserWindow, ipcMain, protocol, net, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const GAME_DIR = path.join(__dirname, 'app');
const settingsFile = () => path.join(app.getPath('userData'), 'desktop.json');

function readSettings() {
  try { return { fullscreen: true, uncapped: false, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) }; }
  catch { return { fullscreen: true, uncapped: false }; }
}
function writeSettings(s) {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(s)); } catch (e) { console.warn(e); }
}

// Flags that must be set before the app is ready.
const settings = readSettings();
if (settings.uncapped) {
  app.commandLine.appendSwitch('disable-frame-rate-limit');
  app.commandLine.appendSwitch('disable-gpu-vsync');
}
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: Math.min(1600, width), height: Math.min(900, height), minWidth: 960, minHeight: 540,
    fullscreen: settings.fullscreen, backgroundColor: '#101411', autoHideMenuBar: true, show: false,
    title: 'Frontline Zero',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false, spellcheck: false,
    },
  });
  win.removeMenu();
  win.once('ready-to-show', () => win.show());
  win.loadURL('app://game/index.html');
  // links in the game (none today) open in the real browser, never inside the game window
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.on('enter-full-screen', () => { settings.fullscreen = true; writeSettings(settings); });
  win.on('leave-full-screen', () => { settings.fullscreen = false; writeSettings(settings); });
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '');
    const file = path.normalize(path.join(GAME_DIR, rel));
    if (!file.startsWith(GAME_DIR)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  ipcMain.handle('desktop:settings', () => ({ ...settings, version: app.getVersion() }));
  ipcMain.handle('desktop:fullscreen', (_e, on) => { if (win) win.setFullScreen(!!on); return !!on; });
  ipcMain.handle('desktop:uncapped', (_e, on) => { settings.uncapped = !!on; writeSettings(settings); return settings.uncapped; });
  ipcMain.handle('desktop:restart', () => { app.relaunch(); app.exit(0); });
  ipcMain.handle('desktop:quit', () => app.quit());
  createWindow();
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
