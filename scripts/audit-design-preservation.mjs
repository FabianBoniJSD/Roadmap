import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

// Compare protected interface contracts to HEAD. No application requests or writes.
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split(/\r?\n/);
const protectedAttributes = new Set([
  'href',
  'id',
  'name',
  'htmlFor',
  'action',
  'method',
  'target',
  'rel',
  'value',
  'defaultValue',
  'onClick',
  'onChange',
  'onSubmit',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
]);
const printer = ts.createPrinter({ removeComments: true });
function contracts(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = [];
  function visit(node) {
    if (ts.isJsxAttribute(node) && protectedAttributes.has(node.name.getText(tree)))
      found.push([
        node.name.getText(tree),
        node.initializer ? printer.printNode(ts.EmitHint.Unspecified, node.initializer, tree) : '',
      ]);
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'NAV_ITEMS')
      found.push(['NAV_ITEMS', printer.printNode(ts.EmitHint.Unspecified, node.initializer, tree)]);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return found;
}
const changed = [];
const legalTextChanges = [];
const navLabelChanges = [];
const textContent = (source) => {
  const tree = ts.createSourceFile(
    'copy.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const values = [];
  function visit(n) {
    if (ts.isJsxText(n) && n.text.trim()) values.push(n.text.trim().replace(/\s+/g, ' '));
    ts.forEachChild(n, visit);
  }
  visit(tree);
  return values;
};
for (const file of tracked.filter((f) => /^(pages|components)\/.*\.tsx$/.test(f))) {
  const before = execFileSync('git', ['show', `HEAD:${file}`], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  const after = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (JSON.stringify(contracts(file, before)) !== JSON.stringify(contracts(file, after)))
    changed.push(file);
  if (
    ['components/SiteFooter.tsx', 'components/SupportChatWidget.tsx'].includes(file) &&
    JSON.stringify(textContent(before)) !== JSON.stringify(textContent(after))
  )
    legalTextChanges.push(file);
  if (
    ['components/SiteHeader.tsx', 'components/Nav.tsx'].includes(file) &&
    JSON.stringify(textContent(before)) !== JSON.stringify(textContent(after))
  )
    navLabelChanges.push(file);
}
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const assets = ['public/logo.png', 'public/JSDDoIT.png', 'public/favicon.ico'];
const brandAssets = assets.map((file) => ({
  file,
  unchanged: hash(execFileSync('git', ['show', `HEAD:${file}`])) === hash(fs.readFileSync(file)),
}));
const routes = tracked.filter(
  (f) => /^pages\/.*\.tsx$/.test(f) && !/^pages\/(?:api|css)\//.test(f) && !/^pages\/_/.test(f)
);
const newRoutes = execFileSync('git', ['ls-files', '--others', '--exclude-standard', 'pages'], {
  encoding: 'utf8',
})
  .trim()
  .split(/\r?\n/)
  .filter((f) => f.endsWith('.tsx'));
const missingRoutes = routes.filter((f) => !fs.existsSync(f));
const report = {
  protectedContractChanges: changed,
  navLabelChanges,
  legalTextChanges,
  removedRoutes: missingRoutes,
  addedRoutes: newRoutes,
  brandAssets,
};
fs.mkdirSync('.taste-skill/after', { recursive: true });
fs.writeFileSync('.taste-skill/after/preservation.json', JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
if (
  changed.length ||
  navLabelChanges.length ||
  legalTextChanges.length ||
  missingRoutes.length ||
  newRoutes.length ||
  brandAssets.some((a) => !a.unchanged)
)
  process.exitCode = 1;
