let inputRate = document.getElementById("baud");
let msglist = document.getElementById("message-list");
let colorpicker = document.getElementById("ledpicker");
let connectbtn = document.getElementById("connectbtn");
let statusindicator = document.getElementById("connection-status");
let timeindicator = document.getElementById("time-container");
let dateindicator = document.getElementById("date-container");
let macropadimage = document.getElementById("macropadimage");

window.addEventListener("load", async (e) => {
  window.dispatchEvent(
    new CustomEvent("HidDeviceStatus", {
      detail: await HidConfig.GetCurrentState(),
    })
  );

  window.dispatchEvent(
    new CustomEvent("HidButtonConfig", {
      detail: await HidConfig.GetCurrentConfig(),
    })
  );

  let now = new Date();
  let datestring =
    String(now.getMonth() + 1).padStart(2, "0") +
    "/" +
    String(now.getDate()).padStart(2, "0") +
    "/" +
    String(now.getFullYear()).padStart(4, "0");
  dateindicator.innerText = datestring;
});

let indexSave;
let ActionIndexSave;
let elementvalueSave;

async function ChangeOwnAction(element, ButtonIndex, ActionIndex) {
  let Properties = {
    Buttonindex: ButtonIndex,
    Actionindex: ActionIndex,
    Actiontype: element.value,
  };
  HidConfig.ChangeButtonAction(Properties);
}

window.addEventListener("HidDeviceStatus", (status) => {
  statusindicator.innerText = status.detail;
  statusindicator.style.color = status.detail == "CONNECTED" ? "green" : "red";
  macropadimage.src =
    status.detail == "CONNECTED"
      ? "./images/macropadconnected.png"
      : "./images/macropaddisconnected.png";
});

window.addEventListener("HidButtonConfig", (data) => {
  let array = data.detail;

  array.ButtonFunctionIndex.forEach((element, idx) => {
    let temp = document.getElementById("btn-" + (idx + 1) + "-0");
    if (element[0] == null) element[0] == 0;
    temp.value = element[0];
    temp = document.getElementById("btn-" + (idx + 1) + "-1");
    if (element[1] == null) element[1] == 0;
    temp.value = element[1];
  });
  array.RotaryFunctionIndex.forEach((element, idx) => {
    let temp = document.getElementById("rty-" + (idx + 1) + "-0");
    if (element[0] == null) element[0] == 0;
    temp.value = element[0];
    temp = document.getElementById("rty-" + (idx + 1) + "-1");
    if (element[1] == null) element[1] == 0;
    temp.value = element[1];
  });
});

function UpdateClock() {
  let now = new Date();

  let currenttime =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");

  timeindicator.innerText = currenttime;
}
UpdateClock();
setInterval(UpdateClock, 30000);
