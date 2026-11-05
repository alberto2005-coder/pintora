'use strict';
// Shared window factory so the real app and the executable-only tests use the
// exact same BrowserWindow options and native shell setup.
const { BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const WINDOW_OPTIONS = {
  width: 1440,
  height: 900,
  minWidth: 900,
  minHeight: 600,
  backgroundColor: '#14161a',
  title: 'Pintora',
  icon: path.join(__dirname, '..', 'dist', 'icon.png'),
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    spellcheck: false
  }
};

function createWindow(overrides) {
  const opts = Object.assign({}, WINDOW_OPTIONS, overrides || {});
  opts.webPreferences = Object.assign({}, WINDOW_OPTIONS.webPreferences, overrides && overrides.webPreferences);
  const win = new BrowserWindow(opts);
  Menu.setApplicationMenu(null); // the editor has its own menu bar
  win.loadFile(path.join(__dirname, '..', 'dist', 'pintora.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  return win;
}

module.exports = { WINDOW_OPTIONS, createWindow };
