'use strict';

const {callbackify} = require('node:util');

const pullout = require('pullout');
const ponse = require('ponse');
const {read} = require('redzip');

const root = require('../root');

const parse = require('./worker');
const isString = (a) => typeof a === 'string';

// warm up
parse('');

const DIR_ROOT = `${__dirname}/../../`;

module.exports = callbackify(async (name, rootDir, request) => {
    check(name, request);
    
    const {method} = request;
    
    switch(method) {
    case 'GET':
        return await onGET(request, name, rootDir);
    
    case 'PUT':
        return await onPUT(request);
    }
});

function parseName(query, name, rootDir) {
    const shortName = name.replace('/markdown', '');
    
    if (query === 'relative')
        return DIR_ROOT + shortName;
    
    return root(shortName, rootDir);
}

async function onGET(request, name, root) {
    const query = ponse.getQuery(request);
    const fileName = parseName(query, name, root);
    const stream = await read(fileName);
    const data = await pullout(stream);
    
    return parse(data);
}

async function onPUT(request) {
    const data = await pullout(request);
    return parse(data);
}

function check(name, request) {
    if (!isString(name))
        throw Error('name should be string!');
    
    if (!request)
        throw Error('request could not be empty!');
}
