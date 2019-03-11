/**
 * Parse sitemaps
 */

'use strict';

const _ = require('lodash');
const URL = require('url');
const fs = require('fs');
const http = require('http');
const https = require('https');
const cheerio = require('cheerio');

module.exports = (config, cb) => {
    _.each(config.sitemaps, (sitemap) => {
        const urls = [];
        const isUrl = sitemap.url.indexOf("http") === 0;

        if (isUrl) {
            const parsedUrl = URL.parse(sitemap.url);
            const httpOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.path,
                method: 'GET',
                auth: config.http && config.http.auth,
                headers: config.http && config.http.headers
            };
            const client = parsedUrl.protocol === 'https:' ? https : http;

            const req = client.request(httpOptions, (res) => {
                let data = '';

                res.setEncoding('utf8');

                if (res.statusCode !== 200) {
                    console.error('Status code returned ' + res.statusCode);
                    cb(sitemap, urls);
                    return;
                }

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', (chunk, encoding) => {
                    if (!!chunk) {
                        data += chunk;
                    }

                    try {
                        const $ = cheerio.load(data);

                        _.each($('url > loc'), (loc) => {
                            //console.log(loc.children);
                            if (!!loc.children.length > 0) {
                                let action;

                                if (loc.attribs['action']) {
                                    action = loc.attribs['action'];
                                }

                                urls.push({
                                    url: loc.children[0].data,
                                    lang: sitemap.lang,
                                    action: action
                                });
                            } else {
                                console.error('No url found for ' + loc);
                            }
                        });

                    } catch (ex) {
                        console.error(ex.message);
                        console.log(ex.stack);
                    } finally {
                        cb(sitemap, urls);
                    }
                });
            });

            req.on('error', (e) => {
                console.error(e.message);
                cb(sitemap, urls);
            });

            req.end();
        } else if (fs.existsSync(sitemap.url)) {
            fs.readFile(sitemap.url, (err, data) => {
                if (err) {
                    console.error(e.message);
                }

                processData(urls, sitemap, data, cb);
            });
        } else {
            console.error('Sitemap url not valid: %s', sitemap.url);
        }


    });
};

function processData(urls, sitemap, data, cb) {

    try {
        const $ = cheerio.load(data);

        _.each($('url > loc'), (loc) => {
            //console.log(loc.children);
            if (!!loc.children.length > 0) {
                urls.push({
                    url: loc.children[0].data,
                    lang: sitemap.lang
                });
            } else {
                console.error('No url found for ' + loc);
            }
        });

    } catch (ex) {
        console.error(ex.message);
        console.log(ex.stack);
    } finally {
        cb(sitemap, urls);
    }
}
