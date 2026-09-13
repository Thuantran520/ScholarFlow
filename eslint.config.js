// Minimal ESLint config — catches real bugs (duplicate keys/cases, unreachable
// code) without style rules or no-undef (the extension modules intentionally
// share one global scope across files).
module.exports = [
  {
    ignores: ["OS/js/content/i18n.js", "node_modules/**", "dist/**", "scripts/split/backup/**"]
  },
  {
    files: ["OS/**/*.js", "scripts/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        chrome: "readonly",
        browser: "readonly",
        location: "readonly",
        URL: "readonly",
        Blob: "readonly",
        FileReader: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        TextEncoder: "readonly",
        Uint8Array: "readonly",
        crypto: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly"
      }
    },
    rules: {
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-constant-condition": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }]
    }
  }
];
