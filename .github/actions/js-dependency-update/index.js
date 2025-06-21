const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");

const isValidBranchName = ({ branchName }) =>
  /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);

const isValidDirName = ({ dirName }) => /^[a-zA-Z0-9_\-\/]+$/.test(dirName);

async function run() {
  const baseBranch = core.getInput("base-branch", {
    required: true,
  });
  const targetBranch = core.getInput("target-branch", {
    required: true,
  });
  const workingDir = core.getInput("working-directory", {
    required: true,
  });
  const ghToken = core.getInput("gh-token", {
    required: true,
  });
  const debug = core.getBooleanInput("debug");

  const commonExecOpts = {
    cwd: workingDir,
  };

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
    core.info(`[js-deps-update] : There are updates available`);
    await exec.exec(`git config --global user.name "gh-automation"`);
    await exec.exec(`git config --global user.email "gh-automation@email.com"`);

    await exec.exec(`git checkout -b ${targetBranch}`, [], {
      ...commonExecOpts,
    });

    await exec.exec(`git add package.json pnpm-lock.yml`, [], {
      ...commonExecOpts,
    });

    await exec.exec(`git commit -m "chore: update dependencies"`, [], {
      ...commonExecOpts,
    });

    await exec.exec(`git push -u origin ${targetBranch} --force`, [], {
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
        head: targetBranch,
      });
    } catch (error) {
      core.error(`[js-deps-update] : smth went wrong`);
      core.setFailed(error.message);
      core.error(error);
    }
  } else {
    core.info(`[js-deps-update] : No updates!`);
  }
}

run();
