/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [2, 'never', ['pascal-case', 'upper-case']],
    // Allow slightly longer headers to avoid noisy failures in CI, keep discipline
    'header-max-length': [2, 'always', 120],
  },
};
