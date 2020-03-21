const json2xml = require('json2xml');
const mysql = require('mysql');

// Set up database
const db = mysql.createConnection({
	host: "127.0.0.1",
	user: "root",
	password: "",
	database: "dataprocessing"
});

db.connect(function(err) {
	if (err) {
		throw err;
	}
	console.log("Connected")
});

// Generate a reponse containing actual data in JSON or XML depending on the accept header
function getResponse(acceptHeader, res, results, resource, xmlElementName) {
	if (acceptHeader === 'application/xml') {
		res.setHeader('Content-Type', 'application/xml');
		res.send(wrapXML(results, resource, xmlElementName));
	} else {
		res.setHeader('Content-Type', 'application/json');
		res.send(wrapJSON(results, resource));
	}
	return res;
}

function wrapJSON(arr, rootelement) {
	var jsondata = {root: []};
	var fromDB = JSON.parse(JSON.stringify(arr));
	for (var i = 0; i < arr.length; i++) {
		jsondata.root[i] = fromDB[i];
	}
	return JSON.parse(JSON.stringify(jsondata).replace('root', rootelement));
}

function wrapXML(arr, rootelement, element) {
	var xmldata = '<?xml version="1.0" encoding="UTF-8"?>';
	xmldata += `<${rootelement}>`;
	for(var i = 0; i < arr.length; i++) {
		xmldata += `<${element}>`;
		xmldata += json2xml(arr[i]);
		xmldata += `</${element}>`;
	}
	xmldata += `</${rootelement}>`;
	return xmldata;
}

exports.db = db;
exports.getResponse = getResponse;