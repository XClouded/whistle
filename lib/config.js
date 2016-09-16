var path = require('path');
var os = require('os');
var httpAgent = require('http').Agent;
var httpsAgent = require('https').Agent;
var fse = require('fs-extra');
var pkgConf = require('../package.json');
var config = require('util')._extend(exports, pkgConf);
var now = Date.now();
var variableProperties = ['port', 'sockets', 'timeout', 'dataDirname', 'storage',
                 		 'username', 'password', 'uipath', 'debug', 'debugMode', 'localUIHost'];

config.ASSESTS_PATH = path.join(__dirname, '../assets');
config.HTTPS_FIELD = 'x-' + config.name + '-https-' + now;
config.CLIENT_IP_HEAD = 'x-forwarded-for-' + config.name + '-' + now;
config.HTTPS_FLAG = config.whistleSsl + '.';

function getHomeDirname() {
	var homedir = (getHomedir() || '').split(/[\/\\]/g);
	for (var i = homedir.length - 1; i >= 0; i--) {
		if (homedir[i]) {
			return homedir[i];
		}
	}
	return '';
}

function getHomedir() {
	//默认设置为`~`，防止Linux在开机启动时Node无法获取homedir
	return (typeof os.homedir == 'function' ? os.homedir() : 
		process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME']) || '~';
}

function getWhistlePath() {
	return process.env.WHISTLE_PATH || path.join(getHomedir(), '.WhistleAppData');
}

function getDataDir(dirname) {
	var dir = path.join(getWhistlePath(), dirname || '.' + config.name);
	fse.ensureDirSync(dir);
	return dir;
}

exports.getDataDir = getDataDir;

function createAgent(config, https) {
	return new (https ? httpsAgent : httpAgent)(config)
					.on('free', preventThrowOutError);
}

function preventThrowOutError(socket) {
	socket.removeListener('error', freeSocketErrorListener);
	socket.on('error', freeSocketErrorListener);
}

function freeSocketErrorListener() {
	var socket = this;
	socket.destroy();
	socket.emit('agentRemove');
	socket.removeListener('error', freeSocketErrorListener);
}

function resolvePath(file) {
	if (!file || !(file = file.trim())) {
		return file;
	}
	
	return /^[\w-]+$/.test(file) ? file : path.resolve(file);
}

exports.extend = function extend(newConf) {
	if (newConf) {
		variableProperties.forEach(function(name) {
			config[name] = newConf[name] || pkgConf[name];
		});
		
		if (Array.isArray(newConf.ports)) {
			config.ports = pkgConf.ports.concat(newConf.ports);
		}
		
		if (typeof newConf.middlewares == 'string') {
			config.middlewares = newConf.middlewares.trim().split(/\s*,\s*/g);
		}
	}
	
	config.middlewares = Array.isArray(config.middlewares) ? config.middlewares.map(resolvePath) : [];
	config.WEINRE_HOST = 'weinre.' + config.localUIHost;
	
	var port = config.port;
	config.ports.forEach(function(name) {
		if (!/port$/.test(name) || name == 'port') {
			throw new Error('port name "' + name + '" must be end of "port", but not equals "port", like: ' + name + 'port');
		}
		config[name] = ++port;
	});
	
	var agentConfig = {
			maxSockets: config.sockets, 
			keepAlive: config.keepAlive, 
			keepAliveMsecs: config.keepAliveMsecs
		};
	config.httpAgent = config.debug ? false : createAgent(agentConfig);
	config.httpsAgent = config.debug ? false : createAgent(agentConfig, true);
	config.uipath = config.uipath ? resolvePath(config.uipath) : './webui/app';
	config.DATA_DIR = getDataDir(config.dataDirname);
	config.storage = config.storage && encodeURIComponent(config.storage);
	var customDirs = path.join(config.DATA_DIR, 'custom_dirs');
	var root = config.storage ? path.join(customDirs, config.storage) : config.DATA_DIR;
	config.rulesDir = path.join(root, 'rules');
	config.valuesDir = path.join(root, 'values');
	config.propertiesDir = path.join(root, 'properties');
	config.homeDirname = getHomeDirname();
	if (config.storage && newConf.copy) {
		var copyDir = typeof newConf.copy == 'string' && encodeURIComponent(newConf.copy);
		if (copyDir !== config.storage) {
			var dataDir = copyDir ? path.join(customDirs, copyDir) : config.DATA_DIR;
			fse.copySync(path.join(dataDir, 'rules'), config.rulesDir);
			fse.copySync(path.join(dataDir, 'values'), config.valuesDir);
			fse.copySync(path.join(dataDir, 'properties'), config.propertiesDir);
		}
	}
	return config;
};