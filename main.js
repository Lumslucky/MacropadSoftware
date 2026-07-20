const { app, BrowserWindow } = require("electron/main");
const { autoUpdater, AppUpdater } = require("electron-updater");
const { createWindow, createTray } = require("./scripts/window");
const {
  HandleUpdateAvailable,
  HandleUpdateDownloaded,
  HandleCheckingUpdate,
} = require("./scripts/updater");
const { InitConnection } = require("./scripts/connection");
const { InitInterProcessCommunication } = require("./scripts/interprocess");
const { test } = require("./scripts/firmwareupdater");

let win;

app.setLoginItemSettings({
  openAtLogin: true,
});

app.whenReady().then(async () => {
  //Allow only one Instance, set callback for when a second instance is opened

  app.on("second-instance", () => {
    try {
      win.show();
    } catch (error) {
      createWindow();
    }
  });

  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }
  // if (app.hasSingleInstanceLock() == false) app.quit();

  //Autoupdate callbacks
  //If update available, latest verssion higher than current version (package.json)
  autoUpdater.on("checking-for-update", HandleCheckingUpdate);
  autoUpdater.on("update-available", HandleUpdateAvailable);
  autoUpdater.on("update-downloaded", HandleUpdateDownloaded);

  //Check for updates and notify Callbacks
  autoUpdater.checkForUpdatesAndNotify();

  //If all windows closed, do NOTHING (Background Process)
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      // app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  createWindow();
  InitConnection();
  InitInterProcessCommunication();
  test();
});

app.once("ready", createTray);
