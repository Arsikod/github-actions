const core = require("@actions/core");
const exec = require("@actions/exec");

const isValidBranchName = ({ branchName }) =>
  /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);

const isValidDirName = ({ dirName }) => /^[a-zA-Z0-9_\-\/]+$/.test(dirName);

async function run() {
  const baseBranch = core.getInput("base-branch");
  const targetBranch = core.getInput("target-branch");
  const workingDir = core.getInput("working-directory");
  const ghToken = core.getInput("gh-token");
  const debug = core.getBooleanInput("debug");

  core.setSecret(ghToken);

  if (!isValidBranchName({ branchName: baseBranch })) {
    // core.error("Invalid base-branch name");
    core.setFailed("Invalid base-branch name");
    return;
  }

  if (!isValidBranchName({ branchName: targetBranch })) {
    core.setFailed("Invalid target-branch name");
    return;
  }

  if (!isValidDirName({ dirName: workingDir })) {
    core.setFailed("Invalid working dir name");
    return;
  }

  core.info(`[js-deps-update] : base branch is ${baseBranch}`);
  core.info(`[js-deps-update] : target branch is ${targetBranch}`);
  core.info(`[js-deps-update] : working dir is ${workingDir}`);

  await exec.exec("pnpm up", [], {
    cwd: workingDir,
  });

  const gitStatus = await exec.getExecOutput(
    "git status -s package*.json",
    [],
    {
      cwd: workingDir,
    }
  );

  if (gitStatus.stdout.length > 0) {
    core.info(`[js-deps-update] : There are updates available`);
  } else {
    core.info(`[js-deps-update] : No updates!`);
  }

  core.info("I am a custom JS action");
}

run();
