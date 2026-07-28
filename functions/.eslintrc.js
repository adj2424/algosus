module.exports = {
  root: true,
  env: {
    es6: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
    // must be last: disables all formatting rules that conflict with
    // Prettier, so formatting is Prettier's job and linting is ESLint's
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['tsconfig.json'],
    sourceType: 'module'
  },
  ignorePatterns: ['/lib/**/*', '/generated/**/*', '.eslintrc.js'],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'import/no-unresolved': 0,
    'new-cap': 0,
    'valid-jsdoc': 0,
    'require-jsdoc': 0
  }
};
