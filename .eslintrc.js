// https://eslint.org/docs/user-guide/configuring
const { resolve } = require('path')

module.exports = {
  root: true,
  parserOptions: {
    parser: 'babel-eslint'
  },
  env: {
    browser: true
  },
  extends: [
    // https://github.com/vuejs/eslint-plugin-vue#priority-a-essential-error-prevention
    // consider switching to `plugin:vue/strongly-recommended` or `plugin:vue/recommended` for stricter rules.
    'plugin:vue/essential',
    // https://github.com/standard/standard/blob/master/docs/RULES-en.md
    'standard'
  ],
  // required to lint *.vue files
  plugins: ['vue'],
  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['~', resolve(__dirname, './src')],
          ['@', resolve(__dirname, './src')]
        ]
      }
    }
  },
  files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
  // add your custom rules here
  rules: {
    // allow async-await
    'generator-star-spacing': 'off',
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    '@typescript-eslint/no-explicit-any': 'on'
  }
}
