/* Checks every JavaScript file for syntax errors:  node tools/check-syntax.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(__dirname, '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let bad = 0;
['js'].flatMap(d => walk(path.join(root, d))).concat([path.join(root, 'sw.js')]).forEach(f => {
  try { new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f }); }
  catch (e) { bad++; console.error('SYNTAX ERROR in ' + path.relative(root, f) + ': ' + e.message); }
});
if (bad) process.exit(1);
console.log('All JavaScript files passed the syntax check.');
