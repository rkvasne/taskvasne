const EXCLUDED_PREFIXES = ["docs/archive/"];

function filterFiles(files) {
  return files.filter((file) => !EXCLUDED_PREFIXES.some((prefix) => file.startsWith(prefix)));
}

module.exports = {
  "**/*.{md,json,yaml,yml,js,mjs,cjs}": (files) => {
    const stagedFiles = filterFiles(files);
    if (stagedFiles.length === 0) return [];
    return ["node .agent/hub/system/scripts/format-worktree.js --staged", "node .agent/hub/system/validators/validator-encoding.js --profile gate --fix --staged"];
  },
};
