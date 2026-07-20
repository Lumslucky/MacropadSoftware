const { shell } = require("electron");

const loudness = require("loudness");
const mediaController = require("node-media-controller");

// const sende = require("node-key-sender");
// const keybord = require("node-input");
// const opan = require("open");
// const {shell} = require('electron');
import("open");

module.exports = {
  NoBinding: () => {},
  IncreaseVolume: () => IncreaseVolume(),
  DecreaseVolume: () => DecreaseVolume(),
  SkipTrack: () => SkipTrack(),
  NextTrack: () => NextTrack(),
  PreviousTrack: () => PreviousTrack(),
  PlayTrack: () => PlayTrack(),
  PauseTrack: () => PauseTrack(),
  ToggleMute: () => ToggleMute(),
  OpenPath: (url) => OpenPath(url),
};

async function OpenPath(url) {
  // await open("https://www.tesla.com/model3-choose");
  // await shell.openPath(url);
  await shell.openExternal(url, { activate: true });
}

async function IncreaseVolume() {
  await loudness.setVolume((await loudness.getVolume()) + 3);
}
async function DecreaseVolume() {
  await loudness.setVolume((await loudness.getVolume()) - 3);
}

async function ToggleMute() {
  await loudness.setMuted(!(await loudness.getMuted()));
}

function SkipTrack() {
  mediaController.executeCommand("skip", function (err, result) {
    if (!err) {
      console.log("done!");
    } else {
      console.error(err);
    }
  });
}
function NextTrack() {
  mediaController.executeCommand("next", function (err, result) {
    if (!err) {
      console.log("done!");
    } else {
      console.error(err);
    }
  });
}
function PreviousTrack() {
  mediaController.executeCommand("previous", function (err, result) {
    if (!err) {
      console.log("done!");
    } else {
      console.error(err);
    }
  });
}
function PlayTrack() {
  mediaController.executeCommand("play", function (err, result) {
    if (!err) {
      console.log("done!");
    } else {
      console.error(err);
    }
  });
}
function PauseTrack() {
  mediaController.executeCommand("pause", function (err, result) {
    if (!err) {
      console.log("done!");
    } else {
      console.error(err);
    }
  });
}
