#!/usr/bin/env node
"use strict";

const repo = {
  owner: "react-native-community",
  repo: "releases"
};

/**
 * @param octokit {import("@octokit/rest").Octokit}
 * @param tag {string}
 * @param notes {string}
 * @param discussionId {string}
 * @returns {Promise<void>}
 */
async function createRelease(octokit, tag, notes, discussionId) {
  const body = `${notes}
---

You can participate in the conversation on the status of this release in [this issue](https://github.com/react-native-community/releases/issues/${discussionId}).

---

If you need help upgrading to this version, please try the [upgrade helper](https://react-native-community.github.io/upgrade-helper/) ⚛️

---

You can find the whole [changelog history](https://github.com/react-native-community/react-native-releases/blob/master/CHANGELOG.md) over at \`react-native-releases\`.
`;

  await octokit.rest.repos.createRelease({
    ...repo,
    tag_name: tag,
    name: tag,
    body
  });
}

/**
 * @param octokit {import("@octokit/rest").Octokit}
 * @param issueNumber {number}
 * @param comment {string}
 * @param lock {boolean=}
 * @returns {Promise<void>}
 */
async function closeIssue(octokit, issueNumber, comment, lock = true) {
  await octokit.rest.issues.createComment({
    ...repo,
    issue_number: issueNumber,
    body: comment
  });
  await octokit.rest.issues.update({
    ...repo,
    issue_number: issueNumber,
    state: "closed"
  });
  if (lock) {
    await octokit.rest.issues.lock({
      ...repo,
      issue_number: issueNumber,
      lock_reason: "resolved"
    });
  }
}

/**
 * @param path {string}
 * @returns {string | boolean}
 */
function fileExists(path) {
  const fs = require("fs");
  const message = "No such file or directory";
  try {
    return Boolean(fs.statSync(path)) || message;
  } catch (_) {
    return message;
  }
}

/**
 * @param octokit {import("@octokit/rest").Octokit}
 * @param targetVersion {import("semver").SemVer}
 * @param targetBranch {string}
 * @returns {Promise<number>}
 */
async function openPatchDiscussions(octokit, targetVersion, targetBranch) {
  const { major, minor, version } = targetVersion;
  const nextVersion = targetVersion.inc("patch").version;

  const body = `Conversations on this thread are limited to ${major}.${minor} release's major issues and backport (cherry-pick) requests from commits that are already on \`${targetBranch}\`.

A good example of a request is a bug fix for a serious issue that has been merged into \`${targetBranch}\` but did not make the ${version} cut, with a link to the specific commit hash on \`${targetBranch}\` to cherry-pick, like this example link: https://github.com/facebook/react-native/commit/bd2b7d6c0366b5f19de56b71cb706a0af4b0be43

In other words, if you cannot point to a particular commit on \`${targetBranch}\`, then your request likely belongs as a new issue in http://github.com/facebook/react-native/issues.
`;

  const response = await octokit.rest.issues.create({
    ...repo,
    title: `Upcoming v${nextVersion} cherry-picks discussion`,
    body,
    labels: ["backport request", "stable"]
  });
  return response.data.number;
}

(async () => {
  const { [2]: issueNumber } = process.argv;
  if (typeof issueNumber !== "string") {
    console.log(
      `usage: ${require("path").basename(__filename)} <GitHub issue number>`
    );
    process.exit(1);
  }

  const { Octokit } = require("@octokit/rest");
  const fs = require("fs");
  const prompts = require("prompts");
  const semver = require("semver");

  const octokit = new Octokit({
    auth: process.env["GITHUB_TOKEN"]
  });

  const response = await octokit.rest.issues.get({
    ...repo,
    issue_number: issueNumber
  });

  const title = response.data.title;
  const m = title.match(/\bv([.\d]+)\b/);
  const targetVersion = m && semver.coerce(m[1]);
  if (!targetVersion) {
    throw new Error(`Could not parse version number from issue: ${title}`);
  }

  const tag = "v" + targetVersion.version;
  const { comment, releaseNotes, readyToGo } = await prompts([
    {
      type: "text",
      name: "comment",
      message: `Close issue '${title}' (#${issueNumber}) with comment:`,
      validate: value =>
        Boolean(value) || "Please enter a comment to close the issue"
    },
    {
      type: "text",
      name: "releaseNotes",
      message: `Create release for ${tag} with release notes in file:`,
      validate: fileExists
    },
    {
      type: "confirm",
      name: "readyToGo",
      message: "Ready to proceed?",
      initial: false
    }
  ]);

  if (!readyToGo) {
    return;
  }

  const discussionsId = await openPatchDiscussions(
    octokit,
    targetVersion,
    "master"
  );

  await createRelease(
    octokit,
    tag,
    fs.readFileSync(releaseNotes, { encoding: "utf-8" }),
    discussionId
  );

  await closeIssue(octokit, issueNumber, comment);
})();
