import * as core from "@actions/core";
import { getFilesByExtension } from "./utils/ExtensionFilter";
import { InputParams } from "./utils/VariableManager";
import { SEARCH_TEXT } from "./utils/texts";
import { processFiles, replaceVariables } from "./utils/FileProcessor";
import path from "path";
import simpleGit, { SimpleGit } from "simple-git";

/**
 * The main function for the action.
 * @param {InputParams} inputParams - The input parameters for the action.
 * @returns {void} Resolves when the action is complete.
 */
export function run(inputParams: InputParams): void {
  const { rootDir, extension, ignoredDir, includeSubDir } = inputParams;
  core.debug(SEARCH_TEXT(extension, rootDir));
  const files: string[] = getFilesByExtension({
    dir: path.join(rootDir),
    extension,
    ignoredDir,
    includeSubDir
  });

  if (files.length === 0) {
    core.warning(`No files found with extension ${extension} in ${rootDir}`);
    return;
  }

  const git: SimpleGit = simpleGit(process.cwd());
  processFiles({
    git,
    files,
    variables: inputParams.envVars,
    encodings: inputParams.encodings,
    extension
  });

  const messageVariables: Map<string, string> = new Map([
    ["extension", extension],
    ["rootDir", rootDir],
    ["amount", files.length.toString()]
  ]);
  const commitMessage: string | undefined = replaceVariables(
    messageVariables,
    inputParams.message
  );
  if (!commitMessage) {
    core.warning("No commit message provided!");
    return;
  }

  git
    .addConfig("user.name", inputParams.userName)
    .addConfig("user.email", inputParams.userEmail)
    .commit(commitMessage)
    .push()
    .then(() => {
      core.info("Files committed successfully!");
    })
    .catch((err: unknown) => {
      throw err;
    });
}
