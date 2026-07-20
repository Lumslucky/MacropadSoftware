const prompt = require("electron-prompt");
const { app, ipcMain } = require("electron");
const path = require("path");

const {
  NoBinding,
  IncreaseVolume,
  DecreaseVolume,
  ToggleMute,
  PlayTrack,
  PauseTrack,
  SkipTrack,
  NextTrack,
  PreviousTrack,
  OpenPath,
} = require("./actions");
const { writeFile, readFile } = require("fs/promises");

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
  OpenPath, //9
];

module.exports = {
  RunAction: (msg) => RunAction(msg),
  ChangeAction: (object) => ChangeAction(object),
  ReadProfile,
};

RetrieveProfile(0);

async function ChangeAction(object) {
  let param = null;
  if (object.Actiontype == 9) {
    await prompt({
      icon: path.join(__dirname, "../includes/static/AppIcon.png"),
      title: "Open:",
      label: "Path",
      value: "",
      inputAttrs: {
        type: "url",
      },
      type: "input",
      customStylesheet: path.join(__dirname, "../renderer/static/main.css"),
    })
      .then((result) => {
        if (result.length <= 0) {
          object.Actiontype = 0;
        } else {
          param = result;
        }
      })
      .catch(console.error);
  }

  if (object.Buttonindex < 6)
    ButtonActionArray[object.Buttonindex][object.Actionindex] =
      new ActionHandler(object.Actiontype, param);
  else
    RotaryActionArray[object.Buttonindex - 6][object.Actionindex] =
      new ActionHandler(object.Actiontype, param);

  SaveProfile(1);
}

function RunAction(msg) {
  if (msg[0] < 6) ButtonActionArray[msg[0]][msg[1]].runFunction();
  else if (msg[0] >= 6 && msg[0] <= 7)
    RotaryActionArray[msg[0] - 6][msg[1]].runFunction();
}

function SaveProfile(ProfileIndex) {
  let ButtonFunctionIndex = new Array();
  let ButtonFunctionParam = new Array();
  let RotaryFunctionIndex = new Array();
  let RotaryFunctionParam = new Array();

  ButtonActionArray.forEach((e) => {
    ButtonFunctionIndex.push([e[0].functionindex, e[1].functionindex]);
    ButtonFunctionParam.push([e[0].param, e[1].param]);
  });

  RotaryActionArray.forEach((e) => {
    RotaryFunctionIndex.push([e[0].functionindex, e[1].functionindex]);
    RotaryFunctionParam.push([e[0].param, e[1].param]);
  });

  let DataTemplate = {
    ProfileIndex: ProfileIndex,
    ButtonFunctionIndex: ButtonFunctionIndex,
    ButtonFunctionParam: ButtonFunctionParam,
    RotaryFunctionIndex: RotaryFunctionIndex,
    RotaryFunctionParam: RotaryFunctionParam,
  };

  let userData = JSON.stringify(DataTemplate);
  let userPath = app.getPath("userData");
  console.log(userData);

  writeFile(userPath + "/hidconfig.json", userData);
}

async function RetrieveProfile(ProfileIndex) {
  let userPath = app.getPath("userData");
  try {
    let jsondata = await readFile(userPath + "/hidconfig.json");
    let data = JSON.parse(jsondata);

    data.ButtonFunctionIndex.forEach((e, idx) => {
      ButtonActionArray[idx][0] = new ActionHandler(
        e[0],
        data.ButtonFunctionParam[idx][0]
      );
      ButtonActionArray[idx][1] = new ActionHandler(
        e[1],
        data.ButtonFunctionParam[idx][1]
      );
    });

    data.RotaryFunctionIndex.forEach((e, idx) => {
      RotaryActionArray[idx][0] = new ActionHandler(
        e[0],
        data.RotaryFunctionParam[idx][0]
      );
      RotaryActionArray[idx][1] = new ActionHandler(
        e[1],
        data.RotaryFunctionParam[idx][1]
      );
    });
  } catch (error) {}
}

ipcMain.handle("GetCurrentConfig", ReadProfile);

async function ReadProfile() {
  let data;
  let userPath = app.getPath("userData");
  try {
    const contents = await readFile(userPath + "/hidconfig.json", {
      encoding: "utf8",
    });
    data = JSON.parse(contents);

    return data;
  } catch (err) {
    console.error(err.message);
  }
}

class ActionHandler {
  constructor(PossibleFunctionIdx, param = null) {
    this.functionindex = PossibleFunctionIdx;
    this.param = param;
  }

  async runFunction() {
    if (this.functionindex == null) this.functionindex = 0;
    if (this.param == null) {
      PossibleActions[this.functionindex]();
    } else {
      PossibleActions[this.functionindex](this.param);
    }
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
