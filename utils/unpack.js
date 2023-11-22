'use strict';
const { execSync  } = require("child_process");
const fs = require('fs');

let rawdata = fs.readFileSync('system.json');
let system = JSON.parse(rawdata);
let packdir = 'source'
fs.rmSync(packdir, { recursive: true, force: true });
for (let i = 0; i < system['packs'].length; i++) {
  let packPath = system['packs'][i]['path'];
  let packNameFromPath = packPath.replace('./packs/', '');
  console.log("Unpacking " + packNameFromPath)
  if (fs.existsSync("packs/"+packNameFromPath)) {
    let fvttProcess = execSync(
        `fvtt package unpack ${packNameFromPath} --outputDirectory source/${packNameFromPath} --inputDirectory packs/`)
    const unpackedFiles = fs.readdirSync("source/" + packNameFromPath);
    let foundFiles = unpackedFiles.length;
    for (let j = 0; j < unpackedFiles.length; j++) {
      let filePath = "source/" + packNameFromPath + "/" + unpackedFiles[j];
      let fileData = fs.readFileSync(filePath);
      fileData = fileData.toString().replace(/\n/g, "\r\n");
      fs.writeFileSync(filePath, fileData);
    }


    console.log(`Unpacking ${packNameFromPath} done (${foundFiles} files found)`)
  } else {
    console.log("Pack " + packNameFromPath + " not found, skipping repack")
  }
}
let numberOfPacked = fs.readdirSync(packdir).length;
console.log("Unpacked " + numberOfPacked + " packs")
