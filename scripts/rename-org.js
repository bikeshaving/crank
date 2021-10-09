#!/usr/bin/env node

import * as fs from "fs";
const pkgPath = new URL("../dist/package.json", import.meta.url).pathname;
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const oldName = pkg.name;
pkg.name = pkg.name.replace(/.*\//, "@bikeshaving/");
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.info(`rewrote package.json name from ${oldName} to ${pkg.name}`);
