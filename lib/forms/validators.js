// --------------------
// Overlook
// Forms
// Validators
// --------------------

// exports

var validators = module.exports = {
	minLen: function(val, options, fieldName, field, formData) { // jshint ignore:line
		if (val.length >= options.param) return;
	
		return '%label must be at least ' + options.param + ' letters';
	},
	maxLen: function(val, options, fieldName, field, formData) { // jshint ignore:line
		if (val.length <= options.param) return;
	
		return '%label cannot be longer than ' + options.param + ' letters';
	},

	int: function(val, options, fieldName, field, formData) { // jshint ignore:line
		if ((val + '').match(/^-?[0-9]+$/)) return;
	
		return '%label must be a whole number';
	},
	intPos: function(val, options, fieldName, field, formData) { // jshint ignore:line
		if ((val + '').match(/^[0-9]+$/)) return;
	
		return '%label must be a positive whole number';
	},
	
	decimal: function(val, options, fieldName, field, formData) { // jshint ignore:line
		if (val.search(/^\-?([0-9]*\.)?[0-9]+$/) == -1) return '%label must be a decimal number';
		
		var pos = val.indexOf('.');
		if (pos == -1) return;
		
		if (options.scale && val.length - pos - 1 > options.scale) return '%label must have no more than ' + options.scale + ' decimal places';
	},
	
	date: function(val, options, fieldName, field, formData) { // jshint ignore:line
		// replace dots with slashes
		val = val.replace(/\./g, '/');
		
		var success = (function() {
			// check all characters valid
			if (val.search(/[^0-9\/]/) != -1) return false;

			// split into parts and check correct form
			var parts = val.split('/');
			if (parts.length < 2 || parts.length > 3) return false;

			// deal with year
			if (parts.length == 2) {
				parts[2] = new Date().getFullYear();
			} else if (parts[2].length == 2) {
				parts[2] = '20' + parts[2];
			} else if (parts[2].length != 4) {
				return false;
			}
			var year = parts[2] * 1;

			// check month
			var month = parts[1] * 1;
			if (month < 1 || month > 12) return false;

			// check day
			var day = parts[0] * 1;
			var monthDays = new Date(year, month, 0).getDate();
			if (day < 1 || day > monthDays) return false;
			
			// all ok
			return true;
		})();
		
		if (!success) return '%label must be a valid date (dd/mm/yyyy)';
	},
	time: function(val, options, fieldName, field, formData) { // jshint ignore:line
		//xxx write this
	},
	dateTime: function(val, options, fieldName, field, formData) { // jshint ignore:line
		//xxx write this
	},
	
	email: function(val, options, fieldName, field, formData) { // jshint ignore:line
		//xxx write this
	},
	url: function(val, options, fieldName, field, formData) { // jshint ignore:line
		//xxx write this
	},
	
	menuOpen: function(val, options, fieldName, field, formData) {
		if (field.required) {
			// check either id or name filled in
			var nameFieldName = fieldName.slice(0, -2) + 'Name';
			if (val == '' && formData[nameFieldName] == '') return field.label + ' is required';
		}
		
		// check id is valid
		if (val != '') return validators.intPos(val, options, fieldName, field, formData);
	}
};
