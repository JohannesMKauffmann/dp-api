const express = require('express');

// Set up API server
const app = express();

app.use('/api/emissies', require('./routes/api/emissies'));

const PORT = 4002;

app.listen(PORT, function() {
	console.log(`Server running on port ${PORT}`)
});
