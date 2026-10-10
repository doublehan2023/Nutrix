const fs = require('node:fs');
const path = require('node:path');

const app = require('./app.json').expo;
const outputsPath = path.join(__dirname, 'amplify_outputs.json');

let amplifyOutputs = {};
if (fs.existsSync(outputsPath)) {
  amplifyOutputs = JSON.parse(fs.readFileSync(outputsPath, 'utf8'));
}

module.exports = {
  ...app,
  extra: {
    ...app.extra,
    amplifyOutputs,
  },
};
