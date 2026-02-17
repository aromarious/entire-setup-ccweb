export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [(message) => /^v?\d+\.\d+\.\d+/.test(message)],
};
