const { exec } = require("child_process");

module.exports = { test };
function test() {
  exec("python --version", (error, stdout, stdin) => {
    console.log(error, stdout, stdin);
  });
}
