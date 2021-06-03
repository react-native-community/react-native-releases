#!/usr/bin/env node

require("ts-node").register({
  // Search for tsconfig relative to this dir instead of cwd executed at
  dir: __dirname,
  transpileOnly: true
});
require("./src/changelog-generator");
