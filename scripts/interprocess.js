const { ipcMain } = require("electron/renderer");
const { GetWindow } = require("./window");
const { ChangeAction } = require("./actionhandler");
const { ReadProfile } = require("./actionhandler");

module.exports = {
  InitInterProcessCommunication,
  SendStatusRenderer: (status) => SendStatusRenderer(status),
};

async function InitInterProcessCommunication() {
  ipcMain.on("ButtonAction", (object, data) => ChangeAction(data));
}

async function SendStatusRenderer(status) {
  try {
    GetWindow().webContents.send("HidStatus", status);
  } catch (error) {
    console.error(error);
  }
}
