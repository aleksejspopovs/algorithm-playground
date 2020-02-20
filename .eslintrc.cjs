module.exports = {
    'env': {
        'browser': true,
        'es6': true,
    },
    'globals': {
        'Atomics': 'readonly',
        'SharedArrayBuffer': 'readonly',
        'd3': 'readonly',
    },
    'parserOptions': {
        'ecmaVersion': 2018,
        'sourceType': 'module',
    },
    'ignorePatterns': ['js/vendor'],
    'extends': 'eslint:recommended',
    'rules': {
        // TODO: turn indent back on and --fix everything.
        'indent': ['off', 2],
        'no-prototype-builtins': 'off',
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'never'],
        'eqeqeq': ['error'],
        'no-unused-vars': ['error', {
            'argsIgnorePattern': '(^_)|(^yieldControl$)',
            'varsIgnorePattern': '^_'
        }],
        'curly': ['error'],
        'no-warning-comments': ['error', {
            'terms': ['TKTK']
        }],
        'brace-style': ['error'],
        'camelcase': ['error'],
    },
    'overrides': [
        {
            'files': ['js/ui/*'],
            'rules': {
                // we have a bunch of code using D3.js indentation conventions there
                'indent': 'off',
            }
        }
    ]
}
