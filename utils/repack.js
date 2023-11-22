'use strict';
const { execSync  } = require("child_process");
const fs = require('fs');

let rawdata = fs.readFileSync('system.json');
let system = JSON.parse(rawdata);
let packdir = 'packs'
fs.rmSync(packdir, { recursive: true, force: true });
for (let i = 0; i < system['packs'].length; i++) {
  let packPath = system['packs'][i]['path'];
  let packNameFromPath = packPath.replace('./packs/', '');
  if (fs.existsSync("source/"+packNameFromPath)) {
    let foundFiles = fs.readdirSync("source/" + packNameFromPath).length;
    console.log(`Repacking ${packNameFromPath}... (${foundFiles} files found)`)
    let fvttProcess = execSync(
        `fvtt package pack ${packNameFromPath} --inputDirectory source/${packNameFromPath} --outputDirectory ${packdir}/`)
    console.log("Repacking " + packNameFromPath + " done")
  } else {
    console.log("Pack " + packNameFromPath + " not found, skipping repack")
  }
}
let numberOfPacked = fs.readdirSync(packdir).length;
console.log("Recreated " + numberOfPacked + " packs")
