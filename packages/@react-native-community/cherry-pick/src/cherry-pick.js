#!/usr/bin/env node
"use strict";

const path = require("path");
const { [2]: reactNativeRepo, [3]: issueNumber } = process.argv;
if (!reactNativeRepo || !issueNumber) {
  console.log(
    `usage: ${path.basename(
      __filename
    )} <react-native repo path> <cherry-picks GitHub issue number>`
  );
  process.exit(1);
}

const { Octokit } = require("@octokit/rest");
const octokit = new Octokit();
octokit.issues
  .get({
    owner: "react-native-community",
    repo: "releases",
    issue_number: issueNumber
  })
  .then(async response => {
    if (response.status !== 200) {
      console.log(response);
      process.exit(1);
    }

    const commitPattern = /facebook\/react-native\/commit\/([0-9a-f]+)/g;
    const datePattern = /Date:\s+([ +-:\w]+)/;

    const git = require("simple-git")({ baseDir: reactNativeRepo });

    const commits = [];

    let match;
    while ((match = commitPattern.exec(response.data.body))) {
      const sha = match[1];
      const entry = await git.show(sha);
      const date = new Date(entry.match(datePattern)[1]);
      commits.push({ sha, date });
    }

    commits.sort((lhs, rhs) => {
      if (lhs.date > rhs.date) {
        return 1;
      } else if (lhs.date < rhs.date) {
        return -1;
      } else {
        return 0;
      }
    });

    commits.forEach(({ sha, date }) => {
      console.log(`git cherry-pick ${sha}  # ${date.toISOString()}`);
    });
  });
