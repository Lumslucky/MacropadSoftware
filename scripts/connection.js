var HID = require("node-hid");
const { SendStatusRenderer } = require("./interprocess");
const { ChangeTrayDescription } = require("./window");
const { RunAction } = require("./actionhandler");
const { ipcMain } = require("electron");

var HidDevice;
var CurrentState = "DISCONNECTED";

module.exports = {
  InitConnection,
  GetCurrentState,
};

ipcMain.handle("GetCurrentState", () => {
  return GetCurrentState();
});

class ActionHandler {
  constructor(PossibleFunctionIdx, param = null) {
    this.functionindex = PossibleFunctionIdx;
    this.param = param;
  }

  async runFunction() {
    if (this.param == null) {
      PossibleActions[this.functionindex]();
    } else {
      PossibleActions[this.functionindex](this.param);
    }
  }
}

let ConnectionIntervalID;
function InitConnection() {
  ConnectionIntervalID = setInterval(Connect, 2000);
}

async function Connect() {
  try {
    HidDevice = await HID.HIDAsync.open(12346, 4097);

    HandleDeviceConnection();

    HidDevice.on("data", (msg) => HandleDeviceData(msg));
    HidDevice.on("error", (err) => HandleDeviceError(err));
  } catch (error) {
    console.error(error);
  }
}

async function SendInitDate() {
  let now = new Date();

  await HidDevice.write([
    0,
    0xd0, //Date Transmission to Device
    now.getUTCFullYear() - 2000,
    now.getMonth() + 1,
    now.getDate(),
  ]);

  await HidDevice.write([
    0,
    0xd1, //Clock Transmission to Device
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ]);
}

function HandleDeviceConnection() {
  CurrentState = "CONNECTED";
  ChangeTrayDescription("Connected");
  SendStatusRenderer("CONNECTED");
  clearInterval(ConnectionIntervalID);
  SendInitDate();
}

function HandleDeviceData(msg) {
  console.log(msg);
  RunAction(msg);
}

function HandleDeviceError() {
  CurrentState = "DISCONNECTED";
  SendStatusRenderer("DISCONNECTED");
  ChangeTrayDescription("Disconnected");
  InitConnection();
}

function GetCurrentState() {
  return CurrentState;
}
