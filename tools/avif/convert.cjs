#!/usr/bin/env node
'use strict';
/**
 * Конвертирует картинки в AVIF прямо в репозитории.
 *   node tools/avif/convert.cjs --list файл     (файл со списком путей, разделитель NUL или \n)
 *   node tools/avif/convert.cjs --all           (все картинки в репозитории)
 * Оригинал удаляется после успешной конвертации, ссылки в .html/.md/.css обновляются.
 * Настройки через переменные окружения: AVIF_QUALITY (60), AVIF_EFFORT (4), REWRITE_REFS (true).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const QUALITY = Number(process.env.AVIF_QUALITY) || 60;
const EFFORT = Number(process.env.AVIF_EFFORT) || 4;
const REWRITE = process.env.REWRITE_REFS !== 'false';
const ROOT = process.cwd();

const EXTS = new Set(['.jpg', '.jpeg', '.jfif', '.png', '.webp', '.bmp', '.gif', '.tif', '.tiff']);
const SKIP_DIRS = new Set(['.git', 'node_modules', '_site', '.ecm-work', 'ecm-dist', 'no-avif']);
// Иконки и превью для соцсетей лучше оставлять в исходном формате.
const SKIP_NAME = /^(favicon|apple-touch-icon|android-chrome|mstile|og-image|social-preview)/i;
const TEXT_EXTS = new Set(['.html', '.htm', '.md', '.markdown', '.css', '.scss']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (e.isFile()) out.push(path.relative(ROOT, path.join(dir, e.name)));
  }
  return out;
}

function isCandidate(file) {
  const parts = file.split(path.sep);
  if (parts.some(p => SKIP_DIRS.has(p))) return false;
  if (!EXTS.has(path.extname(file).toLowerCase())) return false;
  if (SKIP_NAME.test(path.basename(file))) return false;
  return fs.existsSync(file);
}

function readList(listFile) {
  const raw = fs.readFileSync(listFile, 'utf8');
  return raw.split(/\0|\r?\n/).map(s => s.trim()).filter(Boolean);
}

const kib = n => (n / 1024).toFixed(1) + ' КиБ';

async function convertOne(file, results, skipped) {
  const ext = path.extname(file);
  const dir = path.dirname(file);
  const base = path.basename(file, ext);
  try {
    if (ext.toLowerCase() === '.gif') {
      const meta = await sharp(file, { animated: true }).metadata();
      if ((meta.pages || 1) > 1) { skipped.push([file, 'анимированный GIF']); return; }
    }
    let out = path.join(dir, base + '.avif');
    if (fs.existsSync(out)) out = path.join(dir, `${base}-${ext.slice(1).toLowerCase()}.avif`);
    if (fs.existsSync(out)) { skipped.push([file, 'AVIF с таким именем уже есть']); return; }
    await sharp(file).rotate().avif({ quality: QUALITY, effort: EFFORT }).toFile(out);
    const oldSize = fs.statSync(file).size, newSize = fs.statSync(out).size;
    fs.unlinkSync(file);
    results.push({ old: file, new: out, oldSize, newSize });
    console.log(`✓ ${file} → ${out}  ${kib(oldSize)} → ${kib(newSize)}`);
  } catch (e) {
    skipped.push([file, 'ошибка: ' + (e && e.message || e)]);
    console.log(`✗ ${file}: ${e && e.message || e}`);
  }
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function rewriteReferences(results) {
  const counts = new Map();
  for (const f of walk(ROOT)) counts.set(path.basename(f), (counts.get(path.basename(f)) || 0) + 1);
  const map = new Map();
  for (const r of results) {
    const ob = path.basename(r.old);
    if (counts.has(ob)) continue; // такое имя ещё есть в другой папке — не рискуем
    map.set(ob, path.basename(r.new));
  }
  if (!map.size) return 0;
  let changedFiles = 0;
  for (const f of walk(ROOT)) {
    if (!TEXT_EXTS.has(path.extname(f).toLowerCase())) continue;
    let text = fs.readFileSync(f, 'utf8'), next = text;
    for (const [o, n] of map) {
      const re = new RegExp('(^|[\\/"\'(=\\s])' + escapeRegex(o) + '(?=["\')\\s?#>,;]|$)', 'g');
      next = next.replace(re, '$1' + n);
    }
    if (next !== text) { fs.writeFileSync(f, next); changedFiles++; console.log(`  ссылки обновлены: ${f}`); }
  }
  return changedFiles;
}

async function main() {
  const args = process.argv.slice(2);
  let files;
  if (args[0] === '--all') files = walk(ROOT);
  else if (args[0] === '--list' && args[1]) files = readList(args[1]);
  else { console.error('Использование: convert.cjs --all | --list <файл>'); process.exit(2); }
  files = [...new Set(files)].filter(isCandidate);

  console.log(`К конвертации: ${files.length} файл(ов), качество ${QUALITY}, effort ${EFFORT}`);
  const results = [], skipped = [];
  for (const f of files) await convertOne(f, results, skipped);

  let refs = 0;
  if (REWRITE && results.length) refs = rewriteReferences(results);

  const before = results.reduce((s, r) => s + r.oldSize, 0);
  const after = results.reduce((s, r) => s + r.newSize, 0);
  const lines = [
    '### Конвертация в AVIF',
    `Сконвертировано: **${results.length}**, пропущено: **${skipped.length}**, файлов со ссылками обновлено: **${refs}**`,
    results.length ? `Размер: ${kib(before)} → ${kib(after)}` : '',
    ...skipped.map(([f, why]) => `- пропущен \`${f}\`: ${why}`),
    ...results.filter(r => r.newSize > r.oldSize).map(r => `- ⚠ \`${r.new}\` получился больше оригинала`),
  ].filter(Boolean);
  console.log('\n' + lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}

main().catch(e => { console.error(e); process.exit(1); });
