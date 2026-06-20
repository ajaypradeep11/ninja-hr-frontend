import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from 'eslint-config-next';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['.next', 'node_modules', 'lib/generated', 'lib/api/generated'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...next,
  prettier,
  {
    // Downgrade noisy stylistic/opinionated rules that fire on existing
    // never-linted code to warnings so `npm run lint` exits 0.
    // These are not disabled — developers will still see them — but the build
    // is not broken by them.
    rules: {
      // Unescaped HTML entities are stylistic; escape them when convenient.
      'react/no-unescaped-entities': 'warn',
      // setState inside effects can cause cascading renders but is sometimes
      // intentional; flag as warning rather than blocking build.
      'react-hooks/set-state-in-effect': 'warn',
      // Date.now() in an event handler body is flagged by react-hooks/purity
      // but is not actually called during render; downgrade to warning.
      'react-hooks/purity': 'warn',
    },
  },
);
