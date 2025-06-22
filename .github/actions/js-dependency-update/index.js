const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");

const isValidBranchName = ({ branchName }) =>
  /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);

const isValidDirName = ({ dirName }) => /^[a-zA-Z0-9_\-\/]+$/.test(dirName);

async function run() {
  const { workingDir, ghToken, baseBranch, headBranch, debug } =
    getWorkflowInputs();

  const logger = setupLogger({ debug, prefix: "[js-dependency-update]" });

  const commonExecOpts = {
    cwd: workingDir,
  };

  core.setSecret(ghToken);

  logger.debug("Validating inputs - base-branch, head-branch, working dir");

  if (!isValidBranchName({ branchName: baseBranch })) {
    // core.error("Invalid base-branch name");
    core.setFailed("Invalid base-branch name");
    return;
  }

  if (!isValidBranchName({ branchName: headBranch })) {
    core.setFailed("Invalid head-branch name");
    return;
  }

  if (!isValidDirName({ dirName: workingDir })) {
    core.setFailed("Invalid working dir name");
    return;
  }

  logger.debug(`base branch is ${baseBranch}`);
  logger.debug(`head branch is ${headBranch}`);
  logger.debug(`working dir is ${workingDir}`);

  await exec.exec("pnpm up", [], {
    ...commonExecOpts,
  });

  const gitStatus = await exec.getExecOutput(
    "git status -s package*.json",
    [],
    {
      ...commonExecOpts,
    }
  );

  if (gitStatus.stdout.length > 0) {
    logger.debug(`There are updates available`);
    await setupGit();

    await exec.exec(`git checkout -b ${headBranch}`, [], {
      ...commonExecOpts,
    });

    await exec.exec(`git add package.json pnpm-lock.yaml`, [], {
      ...commonExecOpts,
    });

    await exec.exec(`git commit -m "chore: update dependencies"`, [], {
      ...commonExecOpts,
    });

    await exec.exec(`git push -u origin ${headBranch} --force`, [], {
      ...commonExecOpts,
    });

    const octokit = github.getOctokit(ghToken);

    try {
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: "Update pnpm deps",
        body: "this is PR updates pnpm packages",
        base: baseBranch,
        head: headBranch,
      });
    } catch (error) {
      core.error(`[js-deps-update] : smth went wrong`);
      core.setFailed(error.message);
      core.error(error);
    }
  } else {
    logger.debug(`No updates!`);
  }
}

run();

function setupLogger({ debug, prefix } = { debug: false, prefix: "" }) {
  return {
    debug: (message) => {
      if (debug) {
        core.info(`DEBUG ${prefix}${prefix ? " : " : ""}${message}`);
      }
    },
    error: (message) => {
      core.error(`${prefix}${prefix ? " : " : ""}${message}`);
    },
  };
}

function getWorkflowInputs() {
  const baseBranch = core.getInput("base-branch", {
    required: true,
  });
  const headBranch = core.getInput("head-branch", {
    required: true,
  });

  const workingDir = core.getInput("working-directory", {
    required: true,
  });
  const ghToken = core.getInput("gh-token", {
    required: true,
  });
  const debug = core.getBooleanInput("debug");

  return { workingDir, ghToken, baseBranch, headBranch, debug };
}

async function setupGit() {
  await exec.exec(`git config --global user.name "gh-automation"`);
  await exec.exec(`git config --global user.email "gh-automation@email.com"`);
}
