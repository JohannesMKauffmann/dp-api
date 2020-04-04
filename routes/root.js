const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/', function(req, res) {
	// send links to every endpoint, alongside permitted operations
	var docs = fs.readFileSync(path.join(__dirname, 'root.json'));
	docs = JSON.parse(docs.toString('utf-8'));
	res.send(docs);
	res.end();
});

module.exports = router;