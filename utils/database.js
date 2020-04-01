const mysql = require('mysql');

// Set up database
const conn = mysql.createConnection({
	host: "127.0.0.1",
	user: "root",
	password: "",
	database: "dataprocessing"
});

conn.connect(function(err) {
	if (err) {
		throw err;
	}
	console.log("Connected to MySQL database on port 3306")
});

function prepareQuery(sql, inserts) {
	return mysql.format(sql, inserts);
}

exports.conn = conn;

exports.prepareQuery = prepareQuery;