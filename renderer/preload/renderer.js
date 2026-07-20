const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("HidConfig", {
  ChangeButtonAction: (Properties) => ChangeButtonAction(Properties),
  SendDeviceStatus: (status) => SendDeviceStatus(status),
  GetCurrentState,
  GetCurrentConfig,
});

async function GetCurrentConfig() {
  let resp = await ipcRenderer.invoke("GetCurrentConfig");
  console.log(resp);
  return resp;
}

async function GetCurrentState() {
  return await ipcRenderer.invoke("GetCurrentState");
}

async function ChangeButtonAction(Properties) {
  ipcRenderer.send("ButtonAction", {
    Buttonindex: Properties.Buttonindex,
    Actionindex: Properties.Actionindex,
    Actiontype: Properties.Actiontype,
  });
}

function SendDeviceStatus(status) {
  window.dispatchEvent(new CustomEvent("HidDeviceStatus", { detail: status }));
}

ipcRenderer.on("HidStatus", (event, status) => {
  console.log(status);
  SendDeviceStatus(status);
});
