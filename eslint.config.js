// ESLint config — catches real bugs and enforces best practices.
// The extension modules intentionally share one global scope across files.
module.exports = [
  {
    ignores: [
      "OS/js/content/i18n.js",
      "OS/js/libs/peer.min.js",
      "node_modules/**",
      "dist/**",
      "scripts/archive/**",
      "scripts/split/backup/**",
      "tests/test_eval.js",
      "tests/test_privacy.js"
    ]
  },
  {
    files: ["OS/**/*.js", "scripts/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        chrome: "readonly",
        browser: "readonly",
        Peer: "readonly",
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
        AbortController: "readonly",
        Headers: "readonly",
        Response: "readonly",
        Request: "readonly",
        FormData: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        HTMLElement: "readonly",
        Element: "readonly",
        Node: "readonly",
        MutationObserver: "readonly",
        IntersectionObserver: "readonly",
        Audio: "readonly",
        Image: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        postMessage: "readonly",
        addEventListener: "readonly",
        removeEventListener: "readonly",
        dispatchEvent: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        Uint8Array: "readonly",
        crypto: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        Promise: "readonly",
        Array: "readonly",
        Object: "readonly",
        JSON: "readonly",
        Math: "readonly",
        Date: "readonly",
        RegExp: "readonly",
        Error: "readonly",
        Map: "readonly",
        Set: "readonly"
      }
    },
    rules: {
      // Bugs
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-constant-condition": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-extra-semi": "warn",

      // Best practices
      "eqeqeq": ["warn", "always", { "null": "ignore" }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-throw-literal": "error",
      "no-self-compare": "error",
      "no-unused-expressions": "warn",
      "no-useless-call": "warn",
      "no-useless-return": "warn",
      "curly": ["warn", "multi-line"],

      // Variables
      "no-unused-vars": ["warn", {
        "vars": "local",
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "no-shadow": "warn",

      // Style (minimal)
      "no-trailing-spaces": "warn",
      "no-multiple-empty-lines": ["warn", { max: 2 }],
      "eol-last": ["warn", "always"],
      "comma-dangle": ["warn", "only-multiline"],

      // Security
      "no-caller": "error"
    }
  }
];
