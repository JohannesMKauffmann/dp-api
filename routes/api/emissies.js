const express = require('express');
const router = express.Router();
const mysql = require('mysql');

const utils = require('./../../utils');

const resource = 'emissies';
const xmlElementName = 'emissie';

// Get all data
router.get('/', function(req, res) {
	const acceptHeader = req.headers.accept;
	if (acceptHeader === '*/*') {
		res.sendStatus(400).end();
		return;
	}
	let sql = `SELECT * FROM ${resource};`;
	utils.db.query(sql, function(err, results) {
		if (err) {
			throw err;
		}
		utils.getResponse(
			acceptHeader,
			res,
			results,
			resource,
			xmlElementName
		).end();
	});
});

// Get data for a single bron and periode
router.get('/:bron/:periode', function(req, res) {
	const acceptHeader = req.headers.accept;
	if (acceptHeader === '*/*') {
		res.sendStatus(400).end();
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
			res.sendStatus(404).end();
		} else {
			utils.getResponse(
				acceptHeader,
				res,
				results,
				resource,
				xmlElementName
			).end();
		}
	});
});

// router.post('/', function(req, res) {
// 	const acceptHeader = req.headers.accept;
// 	if (acceptHeader === '*/*') {
// 		res.sendStatus(400).end();
// 		return;
// 	}
// 	var data = req.body;
// 	console.log(data);
// 	if (acceptHeader === 'application/xml') {
// 		// jsondata = xml2json(data);
// 	}
// });

module.exports = router;