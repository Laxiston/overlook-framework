// --------------------
// Overlook
// Authentication
// Authenticating user, login, logout etc
// --------------------

// modules
var _ = require('overlook-utils'),
	Promise = require('bluebird-extra');

// libraries
var crypto = require('./crypto'),
	cookies = require('./cookies');

// init

// exports

exports = module.exports = {
	login: function(email, password, remember, res, overlook) {
		return loginCheck(email, password, overlook)
		.then(function(user) {
			if (!user) return;
			
			// set session cookie
			setSessionCookie(user.id, res, overlook);
			
			// set persistent cookie
			if (remember) setLoginCookie(user.id, user.cookieKey, res, overlook);
			delete user.cookieKey;
			
			// return user
			return user;
		});
	},
	
	logout: function(user, res, overlook) {
		// kill cookies
		clearSessionCookie(res, overlook);
		clearLoginCookie(res, overlook);
		
		// wipe user
		delete user.id;
		delete user.name;
		
		// get permissions
		return getPermissions(user, null, overlook)
		.return(user);
	},
	
	processCookies: function(req, res, transaction, overlook) {
		return checkCookies(req, res, transaction, overlook)
		.then(function(user) {
			// get permissions
			return getPermissions(user, transaction, overlook)
			.return(user);
		});
	},
	
	getUser: function(userId, transaction, overlook) {
		return overlook.models.user.find({where: {id: userId, isActive: true}, attributes: ['name'], transaction: transaction})
		.then(function(user) {
			if (!user) return;
			
			// user found
			user = {
				id: userId,
				name: user.name
			};
			
			// get permissions
			return getPermissions(user, transaction, overlook)
			.return(user);
		});
	},
	
	makeHashAndKey: function(password) {		
		return crypto.makeHash(password).then(function(hash) {
			return crypto.makeKey().then(function(key) {
				return [hash, key];
			});
		});
	}
};

function checkCookies(req, res, transaction, overlook) {
	// check session cookie
	var cookie = getSessionCookie(req, res, overlook);
	var user = {};
	var userId;
	if (cookie) {
		if (cookie.timedOut) {
			user.timedOutId = cookie.u;
		} else {
			userId = cookie.u;
		}
	}
	
	// if no active session cookie, check login cookie
	if (!userId) {
		cookie = getLoginCookie(req, res, overlook);
		
		if (cookie) {
			userId = cookie.u;
		} else {
			// return empty user
			return Promise.resolve(user);
		}
	}
	
	// get user details from db and check against cookie
	return overlook.models.user.find({where: {id: userId, isActive: true}, attributes: ['name', 'cookieKey'], transaction: transaction})
	.then(function(dbUser) {
		if (!dbUser) {
			// user not found
			// kill cookies
			if (cookie.k) {
				clearLoginCookie(res, overlook);
			} else {
				clearSessionCookie(res, overlook);
			}
		
			// return empty
			return user;
		}
		
		// check cookieKey valid if login cookie used
		if (cookie.k && dbUser.cookieKey != cookie.k) {
			// login cookie not valid
			clearLoginCookie(res, overlook);
			
			return user;
		}
		
		// user found
		user = {
			id: userId,
			name: dbUser.name
		};
		
		// refresh session cookie (so timeout on cookie is reset) or new session cookie set if login cookie used
		setSessionCookie(userId, res, overlook);
		
		// refresh login cookie if used
		if (cookie.k) setLoginCookie(userId, cookie.k, res, overlook);
		
		// return user
		return user;
	});
}

function getSessionCookie(req, res, overlook) {
	// get cookie
	return cookies.getCookieWithTimeout('sess', req, res, overlook);
}

function setSessionCookie(userId, res, overlook) {
	// set cookie
	cookies.setCookie('sess', {u: userId}, overlook.options.domain.sessionCookieDuration, false, res, overlook);
}

function clearSessionCookie(res, overlook) {
	// clear cookie
	cookies.clearCookie('sess', res, overlook);
}

function getLoginCookie(req, res, overlook) {
	// get cookie
	return cookies.getCookie('rem', req, res, overlook);
}

function setLoginCookie(userId, cookieKey, res, overlook) {
	// set cookie
	cookies.setCookie('rem', {u: userId, k: cookieKey}, overlook.options.domain.loginCookieDuration, true, res, overlook);
}

function clearLoginCookie(res, overlook) {
	// clear cookie
	cookies.clearCookie('rem', res, overlook);
}

function loginCheck(email, password, overlook) {
	return overlook.models.user.find({where: {email: email, isActive: true}, attributes: ['id', 'name', 'passwordHash', 'cookieKey']})
	.then(function(user) {
		// if no user found, return false
		if (!user) return false;
		
		// check password
		return crypto.checkPassword(password, user.passwordHash)
		.then(function(success) {
			if (!success) return false;
		
			// authentication succeeded
			user = {
				id: user.id,
				name: user.name,
				cookieKey: user.cookieKey
			};
			
			// get user permissions
			return getPermissions(user, null, overlook)
			.return(user);
		});
	});
}

function getPermissions(user, transaction, overlook) {
	// if no user id, substitute public user id
	var userId = user.id || overlook.publicUserId;
	
	// get permissions for this user
	var models = overlook.models;
	return models.permission.findAll({
		include: {
			model: models.role,
			attributes: [],
			include: {
				model: models.user,
				attributes: [],
				where: {id: userId}
			}
		},
		transaction: transaction
	})
	.then(function(permissionsArr) {
		// convert db data to permissions object
		var permissions = {};
		_.forEach(permissionsArr, function(permission) {
			permissions[permission.name] = true;
		});
		user.permissions = permissions;
	});
}
