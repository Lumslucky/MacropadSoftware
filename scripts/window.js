const { dialog } = require("electron");
const { app, BrowserWindow, screen, Menu, Tray } = require("electron/main");
const prompt = require("electron-prompt");
const path = require("path");

let win;
let tray;

module.exports = {
  createWindow,
  GetWindow,
  createTray,
  ChangeTrayDescription: (msg) => ChangeTrayDescription(msg),
};

function GetWindow() {
  return win;
}
function ChangeTrayDescription(msg) {
  tray.setToolTip(msg);
}

function CreateAboutPopup() {
  dialog.showMessageBox({
    title: "Version",
    type: "info",
    message: "Current App Version: " + app.getVersion(),
    icon: path.join(__dirname, "../includes/static/AppIcon.png"),
  });
}

async function WindowInit() {
  if (BrowserWindow.getAllWindows().length !== 0) {
    win.show();
    return;
  }
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const subtemplate = [
    { label: "About", click: CreateAboutPopup },
    { label: "Restart Macropad" },
    { label: "Dev Mode", click: ValidateDevMode },
    { label: "Quit", click: app.quit },
  ];

  async function ValidateDevMode() {
    await prompt({
      icon: path.join(__dirname, "../includes/static/AppIcon.png"),
      title: "Admin Verification",
      label: "Password",
      value: "",
      inputAttrs: {
        type: "password",
      },
      type: "input",
      customStylesheet: path.join(__dirname, "../renderer/static/main.css"),
    })
      .then((result) => {
        if (result == "admin2005") {
          OpenDevPanel();
        }
      })
      .catch(console.error);
  }

  function OpenDevPanel() {
    win.webContents.openDevTools();
  }

  const template = [
    {
      label: "App",
      submenu: subtemplate,
      // // {
      // //   role: "ResetMacropad",
      // // },
      // {
      //   role: "Quit",
      // },
    },
  ];
  const menu = new Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  win = new BrowserWindow({
    icon: "includes/static/AppIcon.png",
    width: width,
    height: height,
    frame: true,

    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      preload: path.join(__dirname, "../renderer/preload/renderer.js"),
      webSecurity: true,
    },
  });

  await win.loadFile("./renderer/static/main.html");
}

function createWindow() {
  WindowInit();

  // win.webContents.openDevTools();
  // win.minimize();
}

function createTray() {
  const iconPath = path.join(__dirname, "../includes/static/AppIcon.png");
  tray = new Tray(iconPath);
  const TrayMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        WindowInit();
      },
      type: "normal",
    },
    // { label: "Reconnect", type: "normal" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
      type: "normal",
    },
  ]);
  tray.setToolTip("Macropad");
  tray.setContextMenu(TrayMenu);

  tray.on("click", (e) => {
    WindowInit();
  });
}
