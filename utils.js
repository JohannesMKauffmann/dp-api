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
function getContentType(acceptHeader) {
	const hasJSON = acceptHeader.includes('application/json');
	const hasXML = acceptHeader.includes('application/xml');
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

// Passing request parameters implies a PUT request
function validateData(contentType, resource, data, res, params) {
	var validation = null;
	if (contentType) {
		// validate incoming JSON
		validation = validateJSON(resource, data, params);
	} else {
		// convert from buffer to string
		data = data.toString('utf-8');
		// validate the XML string
		validation = validateXML(resource, data, params);
	}
	if (validation !== null) {
		sendResponse(res, 400, contentType, validation);
		return false;
	}
	// validation / data
	return data;
}

// Validate JSON data, checking if the data adheres to the schema
// and if only one entry is send
// @returns An error message if the data was not validated, null if it was validated
function validateJSON(resource, data, params) {
	// match possible request parameters to the data, otherwise return error message
	if (typeof params !== undefined) {
		for (var key in params) {
			const item = convertDataToNumberWhenPossible(params[key]);
			if (item !== data[resource][0][key]) {
				// request parameters and body don't match
				return getMessage(true, 'Data does not match request URI!');
			}
		}
	}
	// validate data against schema
	const schemapath = `/schemas/json/${resource}.schema.json`;
	var schema = fs.readFileSync(path.join(__dirname, schemapath));
	schema = JSON.parse(schema.toString('utf-8'));
	if (!ajv.validate(schema, data)) {
		// get correct JSON response with link to schema
		return getMessage(
			true, 
			"Please validate your data using the linked schema!",
			"application/schema+json",
			schemapath
		);
	}
	if (data[resource].length > 1) {
		// check if there is more than one data entry	
		return getMessage(true, "You can only send one data entry at a time!");
	}
	return null;
}

// Validate XML data, checking if the data adheres to the schema
// and if only one entry is send
function validateXML(resource, data, params) {
	var message = null;
	const xsdpath = `/schemas/xml/${resource}.xsd`
	const xsd = fs.readFileSync(path.join(__dirname, xsdpath));
	const xsdDoc = libxmljs.parseXml(xsd.toString('utf-8'));
	const xmlDoc = libxmljs.parseXml(data);
	// validate data against xsd
	if (!xmlDoc.validate(xsdDoc)) {
		// send correct XML response with link to schema
		return getMessage(
			false,
			"Please validate your data using the linked schema!",
			"application/xml",
			xsdpath
		);
	}
	// match possible request parameters to the data, otherwise return error message
	if (typeof params !== undefined) {
		for (var key in params) {
			const param = convertDataToNumberWhenPossible(params[key]);
			const xmlItem = convertDataToNumberWhenPossible(xmlDoc.get(`//${key}`).text());
			if (param !== xmlItem) {
				return getMessage(false, 'Data does not match request URI!');
			}
		}
	}
	if (xmlDoc.root().childNodes().length > 3) {
		// if document is valid, check if there is more than one data entry
		return getMessage(false, "You can only send one data entry at a time!");
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
		data[resource][0][key] = convertDataToNumberWhenPossible(nextItem);
	}
	delete data.temp;
	return data;
}

function convertDataToNumberWhenPossible(item) {
	if (isNaN(Number(item))) {
		return item;
	} else {
		return Number(item);
	}
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
		data = { response: {} };
		data.response.message = message;
		if (type) {
			data.response.link = {};
			data.response.link.type = type;
			data.response.link.href = href;
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