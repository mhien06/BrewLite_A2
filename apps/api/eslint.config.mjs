import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'readonly' },
    },
    rules: { 'no-undef': 'error', 'no-unused-vars': 'error' },
  },
  {
    files: ['src/**/*.mjs'],
    languageOptions: { sourceType: 'module' },
    rules: { 'no-undef': 'error', 'no-unused-vars': 'error' },
  },
);
