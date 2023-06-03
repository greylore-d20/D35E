'use strict';
const { exec } = require("child_process");
const fs = require('fs');

let rawdata = fs.readFileSync('system.json');
let system = JSON.parse(rawdata);
console.log(system['packs'])

for (let i = 0; i < system['packs'].length; i++) {
  let packPath = system['packs'][i]['path'];
  let packNameFromPath = packPath.replace('./packs/', '');
  exec("fvtt package pack "+packPath+" --id packs/"+packPath+" --od packs/")
}
