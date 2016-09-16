var getRules = require('./rules');
var getValues = require('./values');
var util = require('./util');
var config = require('../lib/config');
var properties = require('../lib/properties');
var pluginMgr = require('../lib/proxy').pluginMgr;

module.exports = function(req, res) {
	
	res.json({
		version: config.version,
		latestVersion: properties.get('latestVersion'),
		server: util.getServerInfo(req),
		rules: getRules(),
		values: getValues(),
		hideHttpsConnects: properties.get('hideHttpsConnects'),
		interceptHttpsConnects: properties.get('interceptHttpsConnects'),
		filterText: properties.get('filterText'),
		plugins: pluginMgr.getPlugins(),
		disabledAllRules: properties.get('disabledAllRules'),
		disabledPlugins: properties.get('disabledPlugins') || {},
		disabledPluginsRules: properties.get('disabledPluginsRules') || {}, 
		disabledAllPlugins: properties.get('disabledAllPlugins'),
		localUIHost: config.localUIHost
	});
};