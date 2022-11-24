/* global require process */
const fs = require('node:fs');

const gulp      = require('gulp');
const parseArgs = require('minimist');
const babelCore = require('@babel/core');
const webmake   = require('gulp-webmake');
const qunit     = require('gulp-qunit-harness');

const testCafeBrowserTools = require('testcafe-browser-tools');

const args = parseArgs(process.argv.slice(2));

const NOT_DEBUG      = !args.debug;
const LIB_PATH       = 'lib';
const NO_SANDBOX_ARG = '--no-sandbox';
const QUNIT_SETTINGS = {
    port:            2000,
    crossDomainPort: 2001,

    /* eslint-disable no-multi-spaces */
    scripts: [
        { src: '/hammerhead.js', path: 'node_modules/testcafe-hammerhead/lib/client/hammerhead.js' },
        { src: '/core.js',       path: 'node_modules/testcafe/lib/client/core/index.js' },
        { src: '/ui.js',         path: 'node_modules/testcafe/lib/client/ui/index.js' },
        { src: '/automation.js', path: 'node_modules/testcafe/lib/client/automation/index.js' },
        { src: '/driver.js',     path: 'node_modules/testcafe/lib/client/driver/index.js' },

        { src: '/before-test.js',  path: 'test/utils/before-test.js' },
        { src: '/get-selector.js', path: 'test/utils/get-selector.js' },

        { src: '/selector-generator.js', path: 'lib/load-selector-generator.js' },
    ],
    /* eslint-enable no-multi-spaces */

    configApp: require('./test/utils/config-qunit-server-app'),
    basePath:  'test/fixtures',
};

gulp.task('clear', () => {
    return fs.promises.rm(LIB_PATH, { force: true, recursive: true });
});

gulp.task('build-run', () => {
    const transform = (filename, code) => babelCore.transform(code, { filename });
    const compiler  = webmake({ transform });

    return gulp
        .src('test/utils/load-selector-generator.js')
        .pipe(compiler)
        .pipe(gulp.dest(LIB_PATH));
});

gulp.task('build', gulp.series('clear', 'build-run'));

gulp.task('test-run', async () => {
    const browsers       = await testCafeBrowserTools.getInstallations();
    const browserName    = args.browser || 'chrome';
    const browserInfo    = browsers[browserName];
    const targetBrowsers = [{ browserInfo, browserName }];
    const cliSettings    = { browsers: targetBrowsers, timeout: 60 };
    const settings       = NOT_DEBUG && cliSettings;
    const cliMode        = NOT_DEBUG && { cliMode: true };

    if (NOT_DEBUG && /edge|chrome/.test(browserName.toLowerCase()))
        browserInfo.cmd += ` ${NO_SANDBOX_ARG}`;

    return gulp
        .src(['test/fixtures/**/*-test.js'])
        .pipe(qunit(QUNIT_SETTINGS, settings, cliMode));
});

gulp.task('test', gulp.series('build', 'test-run'));
