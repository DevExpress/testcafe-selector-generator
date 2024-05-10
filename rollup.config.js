/* eslint-env node */
/* eslint-disable no-restricted-globals */

import path from 'path';
import resolve from '@rollup/plugin-node-resolve';

const CHUNK_NAMES = [
    'test/utils/load-selector-generator.js',
];

const TARGET_DIR = 'lib';

const CONFIG = CHUNK_NAMES.map(chunk => ({
    input:   chunk,
    context: '(void 0)',

    output: {
        file:   path.join(TARGET_DIR, 'load-selector-generator.js'),
        format: 'iife',
        // NOTE: 'use strict' in our scripts can break user code
        // https://github.com/DevExpress/testcafe/issues/258
        strict: false,
    },

    plugins: [
        resolve(),
    ],
}));

export default CONFIG;
