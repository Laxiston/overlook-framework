// --------------------
// Permissions resource controller
// edit action
// --------------------

// exports

// action definition
exports = module.exports = {
	// functions

	initForm: function(defaultFn) {
		return defaultFn().bind(this)
		.then(function() {
			// modify form
			delete this.form.fields.type;
		});
	},

	access: function(defaultFn) {
		return defaultFn().bind(this)
		.then(function(allowed) {
			// check if is root/admin/user permission, and say no access if so
			return allowed && this.dataMain.type == null;
		});
	}
};
