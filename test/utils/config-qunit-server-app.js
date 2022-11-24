// eslint-disable-next-line no-undef
const url = require('url');


//The following code is copied from testcafe-hammerhead
//NOTE: Url rewrite proxied requests (e.g. for iframes), so they will hit our server
function urlRewriteProxyRequest (req, res, next) {
    const proxiedUrlPartRegExp = /^\/\S+?\/(https?:)/;

    if (proxiedUrlPartRegExp.test(req.url)) {
        // NOTE: store original URL so we can sent it back for testing purposes (see GET xhr-test route).
        req.originalUrl = req.url;

        const reqUrl = req.url.replace(proxiedUrlPartRegExp, '$1');

        //NOTE: create host-relative URL
        const parsedUrl = url.parse(reqUrl);

        parsedUrl.host     = null;
        parsedUrl.hostname = null;
        parsedUrl.port     = null;
        parsedUrl.protocol = null;
        parsedUrl.slashes  = false;
        req.url            = url.format(parsedUrl);

        if (req.query && req.query.filePath)
            req.query.filePath = req.query.filePath.replace(/changeling-iframe-.*\.html/, 'iframe.html');
    }

    next();
}

module.exports = function (app) {
    app.use(urlRewriteProxyRequest);
};
