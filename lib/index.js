// --------------------
// Overlook
// --------------------

// modules
var Promise = require('bluebird-extra'),
	Sequelize = require('sequelize-extra'),
	_ = require('overlook-utils');

// libraries
var overlook = require('./overlook');

// exports
var Overlook = module.exports = function(options) {
	this.init(options);
};

// prototype
_.extend(Overlook.prototype, overlook);

// save Promise, Sequelize, Utils to Overlook and prototype
var common = {
	Promise: Promise,
	Sequelize: Sequelize,
	_: _
};

_.extend(Overlook, common);
_.extend(Overlook.prototype, common);

// save reference to Overlook in prototype
Overlook.prototype.Overlook = Overlook;
