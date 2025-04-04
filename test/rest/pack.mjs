import fs from 'node:fs';
import {join, dirname} from 'node:path';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import test from 'supertape';
import tar from 'tar-stream';
import gunzip from 'gunzip-maybe';
import pullout from 'pullout';
import serveOnce from 'serve-once';
import cloudcmd from '../../server/cloudcmd.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pathZipFixture = join(__dirname, '..', 'fixture/pack.zip');

const pathTarFixture = join(__dirname, '..', 'fixture/pack.tar.gz');

const defaultOptions = {
    config: {
        auth: false,
        root: new URL('..', import.meta.url).pathname,
    },
};

const fixture = {
    tar: fs.readFileSync(pathTarFixture),
    zip: fs.readFileSync(pathZipFixture),
};

const {request} = serveOnce(cloudcmd, defaultOptions);

const once = promisify((name, extract, fn) => {
    extract.once(name, (header, stream) => {
        fn(null, [header, stream]);
    });
});

test('cloudcmd: rest: pack: tar: get', async (t) => {
    const config = {
        packer: 'tar',
        auth: false,
    };
    
    const options = {
        config,
    };
    
    const {request} = serveOnce(cloudcmd, defaultOptions);
    
    const {body} = await request.get(`/api/v1/pack/fixture/pack`, {
        options,
        type: 'stream',
    });
    
    const extract = tar.extract();
    
    body
        .pipe(gunzip())
        .pipe(extract);
    
    const [, stream] = await once('entry', extract);
    const data = await pullout(stream);
    const file = fs.readFileSync(`${__dirname}/../fixture/pack`, 'utf8');
    
    t.equal(file, data, 'should pack data');
    t.end();
}, {
    timeout: 7000,
});

test('cloudcmd: rest: pack: tar: put: file', async (t) => {
    const config = {
        packer: 'tar',
    };
    
    const options = {
        config,
    };
    
    const name = `${Math.random()}.tar.gz`;
    
    const {request} = serveOnce(cloudcmd, defaultOptions);
    
    await request.put(`/api/v1/pack`, {
        options,
        body: getPackOptions(name),
    });
    
    const file = fs.createReadStream(join(__dirname, '..', name));
    const extract = tar.extract();
    
    file
        .pipe(gunzip())
        .pipe(extract);
    
    const [, stream] = await once('entry', extract);
    const data = await pullout(stream, 'buffer');
    const result = fs.readFileSync(`${__dirname}/../fixture/pack`);
    
    fs.unlinkSync(`${__dirname}/../${name}`);
    
    t.deepEqual(result, data, 'should create archive');
    t.end();
});

test('cloudcmd: rest: pack: tar: put: response', async (t) => {
    const config = {
        packer: 'tar',
    };
    
    const options = {
        config,
    };
    
    const name = `${Math.random()}.tar.gz`;
    
    const {body} = await request.put(`/api/v1/pack`, {
        options,
        body: getPackOptions(name),
    });
    
    fs.unlinkSync(`${__dirname}/../${name}`);
    
    t.equal(body, 'pack: ok("fixture")', 'should return result message');
    t.end();
});

test('cloudcmd: rest: pack: tar: put: error', async (t) => {
    const config = {
        packer: 'tar',
    };
    
    const options = {
        config,
    };
    
    const {body} = await request.put(`/api/v1/pack`, {
        options,
        body: getPackOptions('name', ['not found']),
    });
    
    t.match(body, /^ENOENT: no such file or directory/, 'should return error');
    t.end();
});

test('cloudcmd: rest: pack: zip: get', async (t) => {
    const config = {
        packer: 'zip',
    };
    
    const options = {
        config,
    };
    
    const {body} = await request.get(`/api/v1/pack/fixture/pack`, {
        options,
        type: 'buffer',
    });
    
    t.equal(body.length, 145, 'should pack data');
    t.end();
});

test('cloudcmd: rest: pack: zip: put: file', async (t) => {
    const config = {
        packer: 'zip',
    };
    
    const options = {
        config,
    };
    
    const name = `${Math.random()}.zip`;
    
    await request.put(`/api/v1/pack`, {
        options,
        body: getPackOptions(name),
    });
    
    fs.unlinkSync(`${__dirname}/../${name}`);
    
    t.equal(fixture.zip.length, 136, 'should create archive');
    t.end();
});

test('cloudcmd: rest: pack: zip: put: response', async (t) => {
    const config = {
        packer: 'zip',
    };
    
    const options = {
        config,
    };
    
    const name = `${Math.random()}.zip`;
    
    const {body} = await request.put(`/api/v1/pack`, {
        options,
        body: getPackOptions(name),
    });
    
    fs.unlinkSync(`${__dirname}/../${name}`);
    
    t.equal(body, 'pack: ok("fixture")', 'should return result message');
    t.end();
});

test('cloudcmd: rest: pack: zip: put: error', async (t) => {
    const config = {
        packer: 'zip',
        auth: false,
    };
    
    const options = {
        config,
    };
    
    const {body} = await request.put(`/api/v1/pack`, {
        options,
        body: getPackOptions('name', ['not found']),
    });
    
    t.match(body, /^ENOENT: no such file or directory/, 'should return error');
    t.end();
});

const getPackOptions = (to, names = ['pack']) => ({
    to,
    names,
    from: '/fixture',
});
