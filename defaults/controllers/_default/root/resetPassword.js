// --------------------
// Root namespace controller
// resetPassword action
// --------------------

// libraries
var forms = require('../../../../lib/forms'),
	authentication = require('../../../../lib/authentication');

// exports

// action definition
exports = module.exports = {
	// action params
	actionTypes: {
		form: true
	},

	title: 'Reset Password',

	// functions

	initForm: function() {
		// make form
		this.form = forms.createFormFromModel(this.route.overlook.models.user, {only: ['email']});
		this.form.fields.email.widget = 'text';
		this.form.submit = {
			text: 'Reset Password',
			noCancel: true
		};
	},

	access: function() {
		return true;
	},

	act: function() {
		// check email address valid
		return this.models.user.find({
			where: {email: this.actData.email, isActive: true},
			transaction: this.transaction
		}).bind(this)
		.then(function(user) {
			if (!user) {
				// success
				this.actResult = {error: 'invalidEmail'};
				return false;
			}

			// save user to dataMain
			this.dataMain = this.data.user = user;

			// make new password
			var password = authentication.makePassword();
			return authentication.makeHashAndKey(password).bind(this)
			.spread(function(hash, key) {
				return user.updateAttributes({
					passwordHash: hash,
					cookieKey: key,
					isInitialized: false,
					updatedById: this.overlook.systemUserId,
					updatedAt: new Date()
				}, {transaction: this.transaction});
			}).then(function() {
				// email user login details
				var message = {
					subject: 'Cinebox password reset',
					text: 'Hi [name].\n\n' +
						'You requested a password reset.\n\n' +
						'YOUR NEW LOGIN DETAILS:\n' +
						'Website: http://www.cinebox.co/\n' +
						'Email (login): [email]\n' +
						'Password: [password]\n\n' +
						'Many thanks,\n\n' +
						'LSFF tech team\n\n' +
						'--\n' +
						'tech@shortfilms.org.uk\n\n' +
						"Please note that we do not work full-time, so please bear with us if you don't get a reply to\n" +
						'your email straight away.\n'
				};

				var recipient = {
					name: user.name,
					email: user.email,
					password: password
				};

				return this.overlook.mailer.sendBatch(message, recipient)
				.return(true);
			});
		});
	},

	done: function() {
		// redirect
		return this.redirect('/login', 'New password sent to ' + this.dataMain.email);
	},

	failed: function() {
		var error = this.actResult.error;
		if (error == 'invalidEmail') {
			this.formErrors.email = 'That email is not recognised. Please try again.';
			return;
		}

		throw new Error('Unknown error returned from act function');
	}
};
