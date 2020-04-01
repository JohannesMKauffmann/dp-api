const express = require('express');
const router = express.Router();

const utils = require('./../../utils/utils');
const db = require('./../../utils/database');

const resource = 'pompprijzen';
const innerElement = 'pompprijs';

// Get all data
router.get('/', function(req, res) {
	var contentType = utils.checkAcceptHeader(req.headers.accept, res);
	if (contentType === null) {
		return;
	}
	// execute query and send response
	let sql = `SELECT * FROM ${resource};`;
	db.conn.query(sql, function(err, results) {
		if (err) {
			console.log(err);
		}
		const schemapath = utils.getSchemaPath(contentType, resource);
		const type = utils.getContentTypeString(contentType, true);
		const link = utils.formatLink(schemapath, 'schema', type);
		utils.sendResponseWithLink(
			res,
			200,
			link,
			contentType,
			utils.wrapData(contentType, results, resource, innerElement, true)
		);
	});
});

// Get data for a single year
router.get('/:jaar', function(req, res) {
	const contentType = utils.checkAcceptHeader(req.headers.accept, res);
	if (contentType === null) {
		return;
	}
	// build query
	let sql = `SELECT * FROM ${resource} WHERE jaar = ?;`;
	var inserts = [ req.params.jaar ];
	sql = db.prepareQuery(sql, inserts);
	// execute query and send proper response
	db.conn.query(sql, function(err, results) {
		if (err) {
			console.log(err);
		}
		if (!results.length) {
			utils.sendResponse(res, 404);
			return;
		}
		const schemapath = utils.getSchemaPath(contentType, innerElement);
		const type = utils.getContentTypeString(contentType, true);
		const link = utils.formatLink(schemapath, 'schema', type);
		utils.sendResponseWithLink(
			res,
			200, 
			link,
			contentType,
			utils.wrapData(contentType, results, resource, innerElement, false)
		);
	});
});

router.post('/', function(req, res) {
	// check request accept headers
	const acceptHeader = utils.checkAcceptHeader(req.headers.accept, res);
	if (acceptHeader === null) {
		return;
	}
	// check content type
	const contentType = utils.checkContentType(req.headers['content-type'], res, acceptHeader);
	if (contentType === null) {
		return;
	}
	var data = req.body;
	// convert string body to a format we can use
	data = utils.parseData(acceptHeader, contentType, res, data);
	if (!data) {
		return;
	}
	// validate incoming data
	data = utils.validateData(acceptHeader, contentType, innerElement, data, res);
	if (!data) {
		return;
	}
	if (!contentType) {
		// convert xml data to usable JSON data
		data = utils.convertxml2json(data, innerElement);
	}
	// build query
	let sql = `
		INSERT INTO ${resource} (jaar, euro95, diesel, lpg) \
		VALUES (?, ?, ?, ?);
	`;
	var inserts = [
		data.jaar,
		data.euro95,
		data.diesel,
		data.lpg
	];
	sql = db.prepareQuery(sql, inserts);
	// execute query and send proper response
	db.conn.query(sql, function(err, results) {
		if (err && err.code === 'ER_DUP_ENTRY') {
			message = utils.getMessage(
				acceptHeader,
				'There already exists an entry for the given jaar!'
			);
			// request couldn't be completed due to a conflict with the current state of resource.
			utils.sendResponseWithBody(res, 409, acceptHeader, message);
			return;
		}
		const resourcePath = utils.getResourcePath(resource, [data.jaar]);
		utils.sendResponseWithLocation(res, 201, resourcePath);
	});
});

router.put('/', function(req, res) {
	const acceptHeader = utils.checkAcceptHeader(req.headers.accept, res);
	if (acceptHeader === null) {
		return;
	}
	utils.sendResponseWithBody(
		res,
		400,
		acceptHeader,
		utils.getMessage(acceptHeader, `Please PUT at /${resource}{/year}`)
	);
});

router.put('/:jaar', function(req, res) {
	// check request accept headers
	const acceptHeader = utils.checkAcceptHeader(req.headers.accept, res);
	if (acceptHeader === null) {
		return;
	}
	// check content type
	const contentType = utils.checkContentType(req.headers['content-type'], res, acceptHeader);
	if (contentType === null) {
		return;
	}
	var data = req.body;
	// convert string body to a format we can use
	data = utils.parseData(acceptHeader, contentType, res, data);
	if (!data) {
		return;
	}
	// validate incoming data
	data = utils.validateData(acceptHeader, contentType, innerElement, data, res, req.params);
	if (!data) {
		return;
	}
	if (!contentType) {
		// convert xml data to usable JSON data
		data = utils.convertxml2json(data, innerElement);
	}
	// query DB to check wether to insert or update
	let sql = `SELECT jaar FROM ${resource} WHERE jaar = ?`;
	var inserts = [	data.jaar ];
	const resourcePath = utils.getResourcePath(resource, [data.jaar]);
	sql = db.prepareQuery(sql, inserts);
	db.conn.query(sql, function(err, results) {
		if (err) {
			console.log(err);
		}
		if (Object.keys(results).length) {
			// there is already a row, which we now need to replace entirely
			sql = `UPDATE ${resource} SET euro95 = ?, diesel = ?, lpg = ? WHERE jaar = ?`;
			inserts = [
				data.euro95,
				data.diesel,
				data.lpg,
				data.jaar
			];
			sql = db.prepareQuery(sql, inserts);
			db.conn.query(sql, function(err, results) {
				if (err) {
					console.log(err);
				}
				utils.sendResponseWithLocation(res, 204, resourcePath);
			});
			return;
		}
		// there is no existing row, so we need to insert one
		sql = `
			INSERT INTO ${resource} (jaar, euro95, diesel, lpg) \
			VALUES (?, ?, ?, ?);
		`;
		inserts[1] = data.euro95;
		inserts[2] = data.diesel;
		inserts[3] = data.lpg;
		sql = db.prepareQuery(sql, inserts);
		db.conn.query(sql, function(err, results) {
			if (err) {
				console.log(err);
			}
			utils.sendResponseWithLocation(res, 201, resourcePath);
		});
	});
});

router.delete('/:jaar', function(req, res) {
	// Accept headers or Content-Type headers don't matter, since we only send a 204 on succesful deletion
	// or a 404 if the requested resource for deletion was not found
	var jaar = req.params.jaar;
	let sql = `DELETE from ${resource} WHERE jaar = ?;`;
	var inserts = [ jaar];
	sql = db.prepareQuery(sql, inserts);
	db.conn.query(sql, function(err, results) {
		if (err) {
			console.log(err);
		}
		if (!results.affectedRows) {
			utils.sendResponse(res, 404);
			return;
		}
		utils.sendResponse(res, 204);
	});
});

module.exports = router;