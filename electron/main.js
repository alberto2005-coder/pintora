// Electron shell: opens the same single-page editor as a desktop window.
const { app, BrowserWindow } = require('electron');
const { createWindow } = require('./window');

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
