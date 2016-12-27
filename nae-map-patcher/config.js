var priv_info = require('../ronserver/priv_info.js');

module.exports = { 
	database: {
		host: 'localhost',
		user: 'root',
		password: priv_info.pwd,
		database: 'naezith_db'
	}
};
