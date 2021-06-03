const { parallel, task } = require("just-scripts");

require("@rnw-scripts/just-task");
task("lint", parallel("eslint", "ts"));
