const { autoUpdater } = require("electron");
const { contextBridge } = require("electron/renderer");
var HID = require("node-hid");
var Dialogs = require("dialogs");

module.exports = {
  ConnectToHidDevice: () => ConnectToHidDevice(),
};

const {
  NoBinding,
  IncreaseVolume,
  DecreaseVolume,
  PlayTrack,
  PauseTrack,
  SkipTrack,
  NextTrack,
  PreviousTrack,
  ToggleMute,
  OpenBrowser,
} = require("./actions");

const PossibleActions = [
  NoBinding, //0
  IncreaseVolume, //1
  DecreaseVolume, //2
  ToggleMute, //3
  PlayTrack, //4
  PauseTrack, //5
  SkipTrack, //6
  NextTrack, //7
  PreviousTrack, //8
  OpenBrowser, //9
];

class ActionHandler {
  constructor(PossibleFunctionIdx, param = null) {
    this.functionindex = PossibleFunctionIdx;
    this.functionName = PossibleActions[PossibleFunctionIdx];
    this.param = param;
  }

  runFunction() {
    if (this.param == null) {
      this.functionName();
    } else {
      this.functionName(this.param);
    }
  }
}

let HidDevice;

async function ChangeAction(Index, ActionIdx, FunctionIndex, param = null) {
  // console.log(Index);
  // console.log(ActionIdx);
  // console.log(FunctionIndex);
  // console.log(param);

  if (Index < 6) {
    ButtonActionArray[Index][ActionIdx] = new ActionHandler(
      FunctionIndex,
      param
    );
  } else if (Index >= 6) {
    RotaryActionArray[Index - 6][ActionIdx] = new ActionHandler(
      FunctionIndex,
      param
    );
  }
}

async function InputParameter() {
  let dialogs = Dialogs();
  await dialogs.prompt("Path:", "", (msg) => {
    let returnvalue;

    if (msg.length > 0) {
      returnvalue = msg;
    } else {
      returnvalue = null;
    }
    window.dispatchEvent(
      new CustomEvent("return-parameter", { detail: returnvalue })
    );
  });
}

async function SendInitDate() {
  let now = new Date();
  // console.log(now.getHours());
  // console.log(now.getMinutes());
  // console.log(now.getSeconds());
  // console.log(now.getMonth() + 1);
  // console.log(now.getDate());
  // console.log(now.getUTCFullYear() - 2000);

  await HidDevice.write([
    0, //! REPORT ID DU WIXA
    0xd0,
    now.getUTCFullYear() - 2000,
    now.getMonth() + 1,
    now.getDate(),
  ]);

  await HidDevice.write([
    0, //! REPORT ID DUUUU HUND
    0xd1,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ]);
}

async function ConnectToHidDevice() {
  // console.log(devices[ArrayIndex]["path"]);

  // HidDevice = await HID.HIDAsync.open(devices[ArrayIndex]["path"]);
  try {
    HidDevice = await HID.HIDAsync.open(12346, 4097);

    console.log("Connected");
    console.log(HidDevice);
    SendInitDate();
  } catch (error) {
    console.log(error);
  }

  HidDevice.on("data", (e) => {
    console.log(e);
    DispatchMessage(e);
  });
  HidDevice.on("error", (e) => {
    HidDevice = null;
    console.log(e);
    CloseConnection();
    window.dispatchEvent(new CustomEvent("HidCloseConnection", { detail: e }));
  });
}

async function SendDataToPad(data) {
  try {
    await HidDevice.write([0x00, 0x00, 0x01, 0x05]);
    console.log("Sent: " + data);
  } catch (error) {
    console.log(error);
  }
}

function CloseConnection() {
  try {
    HidDevice.close();
  } catch (error) {
    console.log(error);
  }
}

//Each button has its action stored in this function Array
//ButtonActionArray[ButtonID][Action] : Action 0 -> Short Press, Action 1 -> Long Press
const ButtonActionArray = [
  [new ActionHandler(0), new ActionHandler(0)], //1 Button
  [new ActionHandler(0), new ActionHandler(0)],
  [new ActionHandler(0), new ActionHandler(0)],
  [new ActionHandler(0), new ActionHandler(0)],
  [new ActionHandler(0), new ActionHandler(0)],
  [new ActionHandler(0), new ActionHandler(0)],
];

//Rotary Encoder Action Look-up Array
//RotaryActionArray[ID][Action] : ID 0 -> Rotation, ID 1 -> Button : Action 0 -> Short Press, Action 1 -> Long Press
const RotaryActionArray = [
  [new ActionHandler(0), new ActionHandler(0)],
  [new ActionHandler(0), new ActionHandler(0)],
];

//Recieved Message Format: btn 2 0
//Format: device ID action

function DispatchMessage(message) {
  if (message[0] < 6) ButtonActionArray[message[0]][message[1]].runFunction();
  else if (message[0] >= 6 && message[0] <= 7)
    RotaryActionArray[message[0] - 6][message[1]].runFunction();

  window.dispatchEvent(new CustomEvent("HidDeviceData", { detail: message }));
}

function SaveCurrentConfigs() {
  let FunctionIndex = new Array();
  let FunctionParam = new Array();
  ButtonActionArray.forEach((element) => {
    element.forEach((insideelement) => {
      FunctionIndex.push(insideelement.functionindex);
      FunctionParam.push(insideelement.param);
    });
  });
  console.log(FunctionIndex, FunctionParam);
}
function RetrieveCurrentConfigs() {}
