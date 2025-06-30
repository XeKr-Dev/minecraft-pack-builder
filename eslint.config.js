export default [
  {
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'error'
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
]
