const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Set up API server
var app = express();

const xsdpath = path.join(__dirname, '/schemas/xml/')
const schemapath = path.join(__dirname, '/schemas/json/')
app.use('/schemas/xml', express.static(xsdpath));
app.use('/schemas/json', express.static(schemapath));

app.use(bodyParser.text({type: '*/*'}));

app.use('/api/emissies', require('./routes/api/emissies'));
app.use('/api/pompprijzen', require('./routes/api/pompprijzen'));
app.use('/api/brandstofafzet', require('./routes/api/brandstofafzet'));

var config = fs.readFileSync(path.join(__dirname, 'config.json'));
config = JSON.parse(config.toString('utf-8'));

const PORT = config.port;

app.listen(PORT, function() {
	console.log(`Server running on port ${PORT}`)
});
