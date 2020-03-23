const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const utils = require('./../../utils');
const index = require('./../../index');

const resource = 'emissies';
const innerElement = 'emissie';

// Get all data
router.get('/', function(req, res) {
	const contentType = utils.getContentType(req.headers.accept);
	if (contentType === null) {
		utils.sendResponse(
			res,
			400,
			contentType,
			utils.getMessage(contentType, 'Please a include proper Accept header!'))
		return;
	}
	let sql = `SELECT * FROM ${resource};`;
	utils.db.query(sql, function(err, results) {
		if (err) {
			throw err;
		}
		if (contentType) {
			utils.sendResponse(
				res,
				200,
				contentType,
				utils.wrapJSON(results, resource)
			);
		} else {
			utils.sendResponse(
				res,
				200,
				contentType,
				utils.wrapXML(results, resource)
			);
		}
	});
});

// Get data for a single bron and periode
router.get('/:bron/:periode', function(req, res) {
	const contentType = utils.getContentType(req.headers.accept);
	if (contentType === null) {
		utils.sendResponse(
			res,
			400,
			contentType,
			utils.getMessage(contentType, 'Please a include proper Accept header!'))
		return;
	}
	let sql = `SELECT * FROM ${resource} WHERE bron = ? AND periode = ?;`;
	var inserts = [req.params.bron, req.params.periode];
	sql = mysql.format(sql, inserts);
	utils.db.query(sql, function(err, results) {
		if (err) {
			throw err;
		}
		if (!results.length) {
			utils.sendResponse(res, 404);
		} else {
			if (contentType) {
				utils.sendResponse(
					res,
					200,
					contentType,
					utils.wrapJSON(results, resource)
				);
			} else if (!contentType) {
				utils.sendResponse(
					res,
					200,
					contentType,
					utils.wrapXML(results, resource)
				);
			}
		}
	});
});

router.post('/', function(req, res) {
	const contentType = utils.getContentType(req.headers.accept);
	if (contentType === null) {
		utils.sendResponse(res, 400);
		return;
	}
	var data = req.body;
	// validate incoming data
	data = utils.validateData(contentType, resource, data, res);
	if (!data) {
		return;
	}
	if (!contentType) {
		// convert xml string to usable JSON data
		data = utils.convertxml2json(data, resource);
	}
	// build query
	let sql = `
		INSERT INTO ${resource} (bron, periode, nox, co2) \
		VALUES (?, ?, ?, ?);
	`;
	var inserts = [
		data.emissies[0].bron, 
		data.emissies[0].periode,
		data.emissies[0].nox,
		data.emissies[0].co2
	];
	sql = mysql.format(sql, inserts);
	utils.db.query(sql, function(err, results) {
		if (err && err.code === 'ER_DUP_ENTRY') {
			message = utils.getMessage(
				contentType,
				"No duplicate entries for bron and periode are allowed!"
			);
			utils.sendResponse(res, 403, contentType, message);
			return;
		}
		message = utils.getMessage(contentType, "Succesfully created resource");
		utils.sendResponse(
			res,
			201,
			contentType,
			message,
			`/api/${resource}/${data.emissies[0].bron}/${data.emissies[0].periode}`
		);
	});
});

module.exports = router;