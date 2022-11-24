(function () {
    function getTestCafeModule (module) {
        return window['%' + module + '%'];
    }

    //Hammerhead setup
    const hammerheadModule = getTestCafeModule('hammerhead');
    const iframeSandbox    = hammerheadModule.sandbox.iframe;
    const loc              = 'http://localhost/sessionId/https://example.com';

    hammerheadModule.utils.destLocation.forceLocation(loc);

    const iframeTaskScriptTempate = [
        'window["%hammerhead%"].utils.destLocation.forceLocation("{{{location}}}");',
        'window["%hammerhead%"].start({',
        '    referer : "{{{referer}}}",',
        '    cookie: {{{cookie}}},',
        '    serviceMsgUrl : "{{{serviceMsgUrl}}}",',
        '    transportWorkerUrl: "{{{transportWorkerUrl}}}",',
        '    sessionId : "sessionId",',
        '    iframeTaskScriptTemplate: {{{iframeTaskScriptTemplate}}}',
        '});',
    ].join('');

    window.Promise = hammerheadModule.Promise;

    // eslint-disable-next-line max-params
    window.getIframeTaskScript = function (referer, serviceMsgUrl, location, cookie, transportWorkerUrl) {
        return iframeTaskScriptTempate
            .replace('{{{referer}}}', referer || '')
            .replace('{{{serviceMsgUrl}}}', serviceMsgUrl || '')
            .replace('{{{location}}}', location || '')
            .replace('{{{cookie}}}', JSON.stringify(cookie || ''))
            .replace('{{{transportWorkerUrl}}}', transportWorkerUrl || '');
    };

    window.initIframeTestHandler = function (iframe) {
        const referer            = loc;
        const location           = loc;
        const serviceMsgUrl      = '/service-msg/100';
        const transportWorkerUrl = '/transport-worker.js';
        const iframeTaskScript   = window.getIframeTaskScript(referer, serviceMsgUrl, location, '', transportWorkerUrl).replace(/"/g, '\\"');

        if (iframe.id.indexOf('test') !== -1) {
            iframe.contentWindow.eval.call(iframe.contentWindow, [
                'window["%hammerhead%"].utils.destLocation.forceLocation("' + loc + '");',
                'window["%hammerhead%"].start({',
                '    referer: "' + referer + '",',
                '    serviceMsgUrl: "' + serviceMsgUrl + '",',
                '    transportWorkerUrl: "' + transportWorkerUrl + '",',
                '    iframeTaskScriptTemplate: "' + iframeTaskScript + '",',
                '    sessionId: "sessionId",',
                '});',
            ].join(''));
        }
    };

    hammerheadModule.start({ sessionId: 'sessionId', transportWorkerUrl: '/transport-worker.js' });

    //Tests API
    window.getTestCafeModule = getTestCafeModule;

    window.getCrossDomainPageUrl = function (filePath, resourceName) {
        return window.QUnitGlobals.crossDomainHostname + window.QUnitGlobals.getResourceUrl(filePath, resourceName);
    };

    window.getSameDomainPageUrl = function (filePath, resourceName) {
        return window.QUnitGlobals.hostname + window.QUnitGlobals.getResourceUrl(filePath, resourceName);
    };

    window.createTestIframe = function (attrs, parent) {
        const iframe = document.createElement('iframe');

        iframe.id = 'test' + Date.now();

        if (attrs) {
            Object.keys(attrs).forEach(function (attrName) {
                iframe.setAttribute(attrName, attrs[attrName]);
            });
        }

        parent = parent || document.body;

        QUnit.testDone(function () {
            // NOTE: For nested iframes we will delete only top iframe
            if (document.getElementById(iframe.id))
                iframe.parentNode.removeChild(iframe);
        });

        const promise = window.QUnitGlobals.waitForIframe(iframe);

        parent.appendChild(iframe);

        return promise
            .then(function () {
                return iframe;
            });
    };

    QUnit.config.testTimeout                    = 15000;
    window.QUnitGlobals.WAIT_FOR_IFRAME_TIMEOUT = 20000;
    QUnit.config.testTimeout                    = window.QUnitGlobals.WAIT_FOR_IFRAME_TIMEOUT * 2 + 5000;

    QUnit.moduleStart(function () {
        hammerheadModule.sandbox.node.raiseBodyCreatedEvent();
    });

    QUnit.testStart(function () {
        iframeSandbox.on(iframeSandbox.RUN_TASK_SCRIPT_EVENT, window.initIframeTestHandler);
        iframeSandbox.off(iframeSandbox.RUN_TASK_SCRIPT_EVENT, iframeSandbox.iframeReadyToInitHandler);
    });

    QUnit.testDone(function () {
        iframeSandbox.off(iframeSandbox.RUN_TASK_SCRIPT_EVENT, window.initIframeTestHandler);
    });
})();
