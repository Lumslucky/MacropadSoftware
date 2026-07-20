const { app, autoUpdater, dialog } = require("electron");
const prompt = require("electron-prompt");
const path = require("path");

module.exports = {
  HandleUpdateAvailable,
  HandleUpdateDownloaded,
  HandleCheckingUpdate,
};

function HandleUpdateAvailable(
  event,
  releaseNotes,
  releaseName,
  releaseDate,
  updateURL
) {
  dialog.showMessageBox({
    title: "test",
    type: "info",
    message: "An Update is available, please do not close this app",
    icon: path.join(__dirname, "../includes/static/AppIcon.png"),
  });
}

function HandleUpdateDownloaded() {
  autoUpdater.quitAndInstall();
}

function HandleCheckingUpdate() {}
