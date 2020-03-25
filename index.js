const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// Set up API server
var app = express();

const xsdpath = path.join(__dirname, '/schemas/xml/')
const schemapath = path.join(__dirname, '/schemas/json/')
app.use('/schemas/xml', express.static(xsdpath));
app.use('/schemas/json', express.static(schemapath));

app.use(bodyParser.text({type: '*/*'}));

app.use('/api/emissies', require('./routes/api/emissies'));

const PORT = 4002;

app.listen(PORT, function() {
	console.log(`Server running on port ${PORT}`)
});
