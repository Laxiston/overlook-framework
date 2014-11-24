// --------------------
// Overlook
// Routing
// Function to init views
// --------------------

// modules
var _ = require('overlook-utils'),
	fs = require('fs-extra-promise'),
	Promise = require('bluebird-extra'),
	pathModule = require('path'),
	ejsLocals = require('ejs-extra');

// libraries
var errors = require('../errors');

// define global vars
var viewsPath,
	overlook;

// exports

module.exports = function(routes, _overlook, _viewsPath) {
	// save viewsPath & overlook to top level scope
	overlook = _overlook;
	viewsPath = _viewsPath;
	
	// delete compiled views and re-make
	return fs.removeAsync(viewsPath + '/_compiled')
	.then(function() {
		return initActionViews(routes);
	}).then(function() {
		return initErrorViews();
	});
};

function initActionViews(route) {
	return Promise.try(function() {
		// init views for all actions
		if (route.actions) return Promise.in(route.actions, initView);
	}).then(function() {
		// iterate for children
		if (route.routes) return Promise.in(route.routes, initActionViews);
	});
}

function initView(action) {
	// if view set to false, no view - exit
	if (action.view === false) return;
	
	return findView(action)
	.then(function(view) {
		if (_.endsWith(view, '.build')) {
			// compile view from build file
			action.view = '_compiled' + action.routePath;
			return compileViewBuilder(action, view);
		} else {
			// no compilation - ejs file found
			action.view = view;
		}
	});
}

function findView(action) {
	// if view defined, check it exists
	if (action.view) {
		return checkViewExists(action.view, '')
		.then(function(found) {
			if (!found) throw new errors.OverlookError('View \'' + action.view + '\' does not exist');
			return found;
		});
	}
	
	// view not defined - find default to use
	var actionName = action.name;
	var path = pathModule.join(action.routePath.slice(1), '../');
	if (path == './') path = '';
	
	return checkViewExists(path, actionName)
	.then(function(found) {
		if (found) return found;
		
		// direct view does not apply - check for default
		var filePath = '_default' + _.capitalize(action.route.type) + '/';
		
		return (function findView() {
			return checkViewExists(path + filePath, actionName)
			.then(function(found) {
				if (found) return found;
				
				if (path == '') throw new errors.OverlookError('View cannot be found');
				
				path = pathModule.join(path, '../');
				if (path == './') path = '';
				return findView();
			});
		})();
	});
}

function checkViewExists(path, actionName) {
	// make list of potential files to use
	var potentials = [
		path + actionName,
		path + actionName + '.build'
	];
	
	if (actionName != '') {
		potentials.push(path + '_default');
		potentials.push(path + '_default.build');
	}
	
	// check if any of potentials exist
	return Promise.eachAny(potentials, function(path) {
		return fs.existsAsync(viewsPath + '/' + path + '.ejs')
		.then(function(exists) {
			if (exists) return path;
		});
	});
}

function initErrorViews() {
	var errorViewsPath = viewsPath + '/_errors';
	
	return fs.readdirAsync(errorViewsPath)
	.each(function(fileName) {
		if (!_.endsWith(fileName, '.ejs')) return;
		
		return fs.isDirectoryAsync(errorViewsPath + '/' + fileName)
		.then(function(isDirectory) {
			if (isDirectory) return;
			
			// compile error page
			if (_.endsWith(fileName, '.build.ejs')) {
				var view = '_errors/' + fileName.slice(0, -10);
				return compileViewBuilder({view: '_compiled/' + view}, view + '.build');
			} else {
				return fs.copyAsync(errorViewsPath + '/' + fileName, viewsPath + '/_compiled/_errors/' + fileName);
			}
		});
	});
}

function compileViewBuilder(action, view) {
	// compile build template
	var options = _.cloneAll(action);
	options.overlook = overlook;
	options.settings = {views: viewsPath};
	options._ = _;
	
	return Promise.promisify(ejsLocals)(viewsPath + '/' + view + '.ejs', options)
	.then(function(h) {
		h = h.replace(/<\?/g, '<%').replace(/\?>/g, '%>').replace(/<%\?/g, '<?').replace(/\?%>/g, '?>');
		
		return fs.outputFileAsync(viewsPath + '/' + action.view + '.ejs', h);
	});
}
