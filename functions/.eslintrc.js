export const root = true;
export const env = {
  es6: true,
  node: true
};
export const eslintExtends = [
  'eslint:recommended',
  'plugin:import/errors',
  'plugin:import/warnings',
  'plugin:import/typescript',
  'google',
  'plugin:@typescript-eslint/recommended'
];
export const parser = '@typescript-eslint/parser';
export const parserOptions = {
  project: ['tsconfig.json', 'tsconfig.dev.json'],
  sourceType: 'module'
};
export const ignorePatterns = [
  '/lib/**/*', // Ignore built files.
  '/generated/**/*' // Ignore generated files.
];
export const plugins = ['@typescript-eslint', 'import'];
export const rules = {
  quotes: ['error', 'double'],
  'import/no-unresolved': 0,
  indent: ['error', 2]
};
