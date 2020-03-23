const fs = require('fs');
const path = require('path');

const mysql = require('mysql');

const libxmljs = require('libxmljs');
const json2xml = require('json2xml');
const xml2json = require('xml2json-light');

const Ajv = require('ajv');
var ajv = new Ajv();

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

// Get the content type of the response by looking at the Accept header of the request
// @returns true for JSON or if both are present, false for XML, null if neither are present in the header
function getContentType(contentType) {
	const hasJSON = contentType.includes('application/json');
	const hasXML = contentType.includes('application/xml');
	if (!hasJSON && !hasXML) {
		return null;
	} else {
		return hasJSON;
	}
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

function validateData(contentType, resource, data, res) {
	if (contentType) {
		// validate incoming JSON
		const validation = validateJSON(resource, data);
		if (validation !== null) {
			res.status(400).send(validation).end();
			return false;
		}
	} else {
		// convert from buffer to string
		data = data.toString('utf-8');
		// validate the XML string
		const validation = validateXML(resource, data);
		if (validation !== null) {
			res.status(400).set('Content-Type', 'application/xml').send(validation).end();
			return false;
		}
	}
	return data;
}

// Validate JSON data, checking if the data adheres to the schema
// and if only one entry is send
// @returns An error message if the data was not validated
function validateJSON(resource, data) {
	var message = null;
	// validate data against schema
	const schemapath = `/schemas/json/${resource}.schema.json`;
	var schema = fs.readFileSync(path.join(__dirname, schemapath));
	schema = JSON.parse(schema.toString('utf-8'));
	if (!ajv.validate(schema, data)) {
		// send correct JSON response with link to schema
		message = getMessage(
			true, 
			"Please validate your data using the linked schema!",
			"application/schema+json",
			schemapath
		);
	} else {
		// check if there is more than one data entry
		if (data[resource].length > 1) {
			message = getMessage(true, "You can only send one data entry at a time!");
		}
	}
	return message;
}

// Validate XML data, checking if the data adheres to the schema
// and if only one entry is send
// @returns An array, containing wether or not the data was validated and an optional error message
function validateXML(resource, data) {
	var message = null;
	// validate data against xsd
	const xsdpath = `/schemas/xml/${resource}.xsd`
	var xsd = fs.readFileSync(path.join(__dirname, xsdpath));
	const xsdDoc = libxmljs.parseXml(xsd.toString('utf-8'));
	const xmlDoc = libxmljs.parseXml(data);
	if (!xmlDoc.validate(xsdDoc)) {
		// send correct XML response with link to schema
		message = getMessage(
			false,
			"Please validate your data using the linked schema!",
			"application/xml",
			xsdpath
		);
	} else {
		// check if there is more than one data entry
		if (xmlDoc.childNodes.length > 3) {
			getMessage(false, "You can only send one data entry at a time!");
		}
	}
	return message;
}

// Convert an XML string to our JSON format
function convertxml2json(data, resource) {
	data = xml2json.xml2json(data);
	data.temp = data.emissies.emissie;
	data[resource] = [{}];
	for (var key in data.temp) {
		const nextItem = data.temp[key];
		if (isNaN(Number(nextItem))) {
			data[resource][0][key] = nextItem;
		} else {
			data[resource][0][key] = Number(nextItem);
		}
	}
	delete data.temp;
	return data;
}

function getMessage(contentType, message, type, href) {
	data = {};
	if (contentType || contentType === null) {
		data.message = message;
		if (type) {
			data.link = {};
			data.link.type = type;
			data.link.href = href;
		}
		return data;
	} else {
		data = { error: {} };
		data.error.message = message;
		if (type) {
			data.error.link = {};
			data.error.link.type = type;
			data.error.link.href = href;
		}
		data = json2xml(data);
		return data;
	}
}

// Send a response. The content type can be null, and message and location can be omitted
function sendResponse(res, status, contentType, message, location) {
	if (contentType || contentType === null) {
		contentType = 'application/json';
	} else {
		contentType = 'application/xml';
	}
	if (typeof location !== 'undefined') {
		res.location(location).status(status).set('Content-Type', contentType).send(message).end();
	} else {
		if (contentType === 'undefined') {
			res.status(status).end();
		} else {
			res.status(status).set('Content-Type', contentType).send(message).end();
		}
	}
}

exports.db = db;

exports.getContentType = getContentType;

exports.wrapJSON = wrapJSON;
exports.wrapXML = wrapXML;

exports.validateData = validateData;

exports.convertxml2json = convertxml2json;

exports.getMessage = getMessage;
exports.sendResponse = sendResponse;