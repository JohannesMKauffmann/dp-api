const fs = require('fs');
const path = require('path');

const libxmljs = require('libxmljs');
const json2xml = require('json2xml');
const xml2json = require('xml2json-light');

const Ajv = require('ajv');
var ajv = new Ajv();

// Checks if the client accepts JSON or XML
// If the client supports neither, send a response with an error message
// @returns true for JSON or if both are present, false for XML, null if neither
function checkAcceptHeader(acceptHeader, res) {
	const acceptsJSON = acceptHeader.includes('application/json');
	const acceptsXML = acceptHeader.includes('application/xml');
	if (!acceptsJSON && !acceptsXML) {
		// we can only serve content in application/json or application/xml, which is deemed not acceptable by the client
		const message = getMessage(
			true,
			'Please include an Accept header which accepts either JSON, XML or both!'
		);
		sendResponseWithBody(res, 406, true, message);
		return null;
	} else {
		return acceptsJSON;
	}
}

// Checks if the content type is in JSON or XML
// If the client sends an empty header or neither are present, send a response with an error message
// @returns true for JSON or if both are present, false for XML. Null in all other cases
function checkContentType(contentType, res, acceptHeader) {
	if (contentType === undefined) {
		const message = getMessage(
			acceptHeader,
			'Please specify a non-empty Content-Type header!'
		);
		sendResponseWithBody(res, 400, contentType, message);
		return null;
	}
	const isJSON = contentType.includes('application/json');
	const isXML = contentType.includes('application/xml');
	if (!isJSON && !isXML) {
		const message = getMessage(
			acceptHeader,
			'Please specify the Content-Type header in either JSON or XML format!'
		);
		sendResponseWithBody(res, 400, contentType, message);
		return null;
	}
	return isJSON;
	
}

function wrapData(contentType, results, resource, innerElement, multiple) {
	if (!multiple) {
		resource = undefined;
	}
	if (contentType) {
		return wrapJSON(results, resource, innerElement);
	} else {
		return wrapXML(results, resource, innerElement);
	}
}

function wrapJSON(arr, resource, innerElement) {
	if (resource === undefined) {
		// wrap single data entry
		resource = innerElement;
		var jsondata = {};
		var fromDB = JSON.parse(JSON.stringify(arr));
		jsondata = fromDB[0];
	} else {
		// wrap every entry from the DB
		var jsondata = {[resource]: []};
		var fromDB = JSON.parse(JSON.stringify(arr));
		for (var i = 0; i < arr.length; i++) {
			jsondata[resource][i] = fromDB[i];
		}
	}
	return JSON.parse(JSON.stringify(jsondata));
}

function wrapXML(arr, resource, innerElement) {
	var xmldata = '<?xml version="1.0" encoding="UTF-8"?>';
	if (resource !== undefined) {
		xmldata += `<${resource}>`;
	}
	for(var i = 0; i < arr.length; i++) {
		xmldata += `<${innerElement}>`;
		xmldata += json2xml(arr[i]);
		xmldata += `</${innerElement}>`;
	}
	if (resource !== undefined) {
		xmldata += `</${resource}>`;
	}
	return xmldata;
}

function parseData(acceptHeader, contentType, res, data) {
	const firstChar = data.substring(0, 1);
	// first, check if the content type corresponds to the data
	if ((contentType && firstChar !== '{') || (!contentType && firstChar !== '<')) {
		// content type and data don't match
		const message = getMessage(acceptHeader, 'The data format and Content-Type header do not match!');
		sendResponseWithBody(res, 415, acceptHeader, message);
		return null;
	}
	// only parse JSON data, since we parse XML data elsewhere
	try {
		if (contentType) {
			data = JSON.parse(data);
		} else {
			data = libxmljs.parseXml(data);
		}
	} catch (err) {
		// failed to parse data
		const message = getMessage(acceptHeader, 'Failed to parse data! Please make sure your data is syntactically correct!');
		sendResponseWithBody(res, 400, acceptHeader, message);
		return null;
	}
	return data;
}

// Passing request parameters implies a PUT request
function validateData(acceptHeader, contentType, resource, data, res, params) {
	var validation = null;
	var matched = null;
	if (contentType) {
		// validate incoming JSON
		validation = validateJSON(resource, data, acceptHeader);
		matched = matchJSONRequestParams(params, data, acceptHeader);
	} else {
		// convert from buffer to string
		data = data.toString('utf-8');
		// validate the XML string
		validation = validateXML(resource, data, acceptHeader);
		matched = matchXMLRequestParams(params, data, acceptHeader);
	}
	if (validation !== null) {
		const schema = getSchemaPath(contentType, resource);
		const type = getContentTypeString(resource, true);
		const link = formatLink(schema, 'schema', type);
		// since the data could not be validated according to the schema,
		// the request body is in a format we don't support.
		// thus, the validity and therefore the mediatype is unsupported
		sendResponseWithLink(res, 415, link, acceptHeader, validation);
		return false;
	}
	if (matched !== null) {
		// request syntax is malformed, since appareantly the request was made to a URI
		// that doesn't correspond with the data
		sendResponseWithBody(res, 400, acceptHeader, matched);
	}
	// validation / data
	return data;
}

// Validate JSON data, checking if the data adheres to the schema
// and if only one entry is send
// @returns An error message if the data was not validated, null if it was validated
function validateJSON(resource, data, acceptHeader) {
	// validate data against schema
	const schemapath = '../' + getSchemaPath(true, resource);
	var schema = fs.readFileSync(path.join(__dirname, schemapath));
	schema = JSON.parse(schema.toString('utf-8'));
	if (!ajv.validate(schema, data)) {
		// get correct JSON response with link to schema
		return getMessage(
			acceptHeader, 
			"Please validate your data using the linked schema!",
			"application/schema+json"
		);
	}
	return null;
}

function matchJSONRequestParams(params, data, acceptHeader) {
	// match request parameters to the data, otherwise return error message
	if (typeof params !== undefined) {
		for (var key in params) {
			const item = convertDataToNumberWhenPossible(params[key]);
			if (item !== data[key]) {
				// request parameters and body don't match
				return getMessage(acceptHeader, 'Data does not match request URI!');
			}
		}
	}
	return null;
}

// Validate XML data, checking if the data adheres to the schema
// and if only one entry is send
function validateXML(resource, data, acceptHeader) {
	const xsdpath = '../' + getSchemaPath(false, resource);
	const xsd = fs.readFileSync(path.join(__dirname, xsdpath));
	const xsdDoc = libxmljs.parseXml(xsd.toString('utf-8'));
	const xmlDoc = libxmljs.parseXml(data);
	//data = libxmljs.parseXml(data);
	if (!xmlDoc.validate(xsdDoc)) {
		// send correct XML response with link to schema
		return getMessage(
			acceptHeader,
			"Please validate your data using the linked schema!"
		);
	}
	return null;
}

function matchXMLRequestParams(params, data, acceptHeader) {
	const xmlDoc = libxmljs.parseXml(data);
	// match possible request parameters to the data, otherwise return error message
	if (typeof params !== undefined) {
		for (var key in params) {
			const param = convertDataToNumberWhenPossible(params[key]);
			const xmlItem = convertDataToNumberWhenPossible(xmlDoc.get(`//${key}`).text());
			if (param !== xmlItem) {
				return getMessage(acceptHeader, 'Data does not match request URI!');
			}
		}
	}
	return null;
}

// Convert an XML data to our JSON format
function convertxml2json(data, resource) {
	data = xml2json.xml2json(data);
	for (var key in data[resource]) {
		const nextItem = data[resource][key];
		data[key] = convertDataToNumberWhenPossible(nextItem);
	}
	delete data[resource];
	return data;
}

function convertDataToNumberWhenPossible(item) {
	if (isNaN(Number(item))) {
		return item;
	} else {
		return Number(item);
	}
}

// Get the path of a specific data entry by resource
function getResourcePath(resource, dataArray) {
	var path = `/api/${resource}`;
	for (var key in dataArray) {
		path += `/${dataArray[key]}`;
	}
	return path;
}

// Get the path of the JSON or XML schema per resource
function getSchemaPath(contentType, resource) {
	if (contentType) {
		return `/schemas/json/${resource}.schema.json`;
	}
	return `/schemas/xml/${resource}.xsd`;
}



// assumes non-null booleans
function getContentTypeString(contentType, hasSchema) {
	if (contentType) {
		if (hasSchema) {
			return 'application/schema+json';
		}
		return 'application/json';
	} else {
		return 'application/xml';
	}
}

function getMessage(contentType, message) {
	data = {};
	if (contentType) {
		data.message = message;
		return data;
	} else {
		data = { response: {} };
		data.response.message = message;
		data = json2xml(data);
		return data;
	}
}

// Sends a response
function sendResponse(res, status) {
	res.status(status).end();
}

// Sends a response with a body
function sendResponseWithBody(res, status, contentType, message) {
	contentType = getContentTypeString(contentType);
	res.status(status).set('Content-Type', contentType).send(message).end();
}

// Sends a response with a location, without body
function sendResponseWithLocation(res, status, location) {
	res.status(status).location(location).end();
}

// Sends a response with a link relation and body
function sendResponseWithLink(res, status, link, contentType, message) {
	res.status(status).set('Link', link).set('Content-Type', getContentTypeString(contentType)).send(message).end();
}

function formatLink(href, rel, type) {
	return `<${href}>; rel="${rel}"; type="${type}"`;
}

exports.checkAcceptHeader = checkAcceptHeader;
exports.checkContentType = checkContentType;

exports.wrapData = wrapData;

exports.parseData = parseData;

exports.validateData = validateData;

exports.convertxml2json = convertxml2json;

exports.getContentTypeString = getContentTypeString;

exports.getMessage = getMessage;
exports.sendResponse = sendResponse;
exports.sendResponseWithBody = sendResponseWithBody;
exports.sendResponseWithLocation = sendResponseWithLocation;
exports.sendResponseWithLink = sendResponseWithLink;

exports.formatLink = formatLink;

exports.getResourcePath = getResourcePath;
exports.getSchemaPath = getSchemaPath;