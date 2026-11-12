import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
  {
    // components/ui es código generado por shadcn: no se revisa con lint
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/playwright-report/',
      '**/test-results/',
      'frontend/src/components/ui/',
    ],
  },
  js.configs.recommended,
  {
    files: ['backend/**/*.js', '*.js'],
    languageOptions: { globals: globals.node },
  },
  // El frontend es TypeScript; el backend sigue en JavaScript
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['frontend/**/*.{ts,tsx}'] })),
  {
    files: ['frontend/*.ts', 'frontend/e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
];
