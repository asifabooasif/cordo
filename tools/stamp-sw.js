/* Rewrites VERSION and ASSETS in sw.js from the files on disk.
   Run it before every commit:  node tools/stamp-sw.js
   (the GitHub Pages workflow runs it for you). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = ['index.html', 'manifest.webmanifest']
  .concat(['css', 'js', 'icons'].flatMap(d => walk(path.join(root, d)).map(f => path.relative(root, f).split(path.sep).join('/'))))
  .sort();
const hash = crypto.createHash('sha1');
files.forEach(f => { hash.update(f); hash.update(fs.readFileSync(path.join(root, f))); });
const version = 'gem-erp-' + hash.digest('hex').slice(0, 10);
const swPath = path.join(root, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const VERSION = '[^']*';/, "const VERSION = '" + version + "';");
sw = sw.replace(/\/\* ASSETS:BEGIN \*\/[\s\S]*?\/\* ASSETS:END \*\//,
  '/* ASSETS:BEGIN */\nconst ASSETS = [\n  \'./\',\n' + files.map(f => "  '" + f + "'").join(',\n') + '\n];\n/* ASSETS:END */');
fs.writeFileSync(swPath, sw);
console.log('sw.js stamped: ' + version + ' (' + files.length + ' files)');
