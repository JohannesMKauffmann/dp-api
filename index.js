const express = require('express');
const bodyParser = require('body-parser');

// Set up API server
const app = express();

app.use(express.json());
app.use(bodyParser.raw({type: '*/xml'}));

app.use('/api/emissies', require('./routes/api/emissies'));

const PORT = 4002;

app.listen(PORT, function() {
	console.log(`Server running on port ${PORT}`)
});
