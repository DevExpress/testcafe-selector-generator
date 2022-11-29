module.exports = {
    env: {
        qunit: true,
    },
    extends: [
        'plugin:qunit/recommended',
    ],
    plugins: [
        'qunit',
    ],
    rules: {
        'max-lines':                   ['off'],
        'no-empty-function':           ['off'],
        'no-useless-escape':           ['off'],
        'object-shorthand':            ['off'],
        'prefer-arrow-callback':       ['off'],
        'qunit/no-global-assertions':  ['off'],
        'qunit/no-global-module-test': ['off'],
        'qunit/no-global-stop-start':  ['off'],
        'quotes':                      ['off'],
        'wrap-iife':                   ['off'],
    },
};
