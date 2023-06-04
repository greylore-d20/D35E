'use strict';
const { exec } = require("child_process");
const fs = require('fs');

let rawdata = fs.readFileSync('system.json');
let system = JSON.parse(rawdata);
for (let i = 0; i < system['packs'].length; i++) {
  let packPath = system['packs'][i]['path'];
  let packNameFromPath = packPath.replace('./packs/', '');
  console.log("Repacking "+packNameFromPath+"...")
  exec("fvtt package pack "+packNameFromPath+" --input-directory source/"+packNameFromPath+" --output-directory packs/")
  console.log("Repacking "+packNameFromPath+"...")
}
