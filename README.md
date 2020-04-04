# Dataprocessing API backend

This repository contains all the code nessecary to get the API backend up and running.

## Requirements
- NodeJS (at least v12.16.1)
- MySQL server running on the default port (API was tested with MySQL provided by XAMPP)

## Getting started
Open a terminal window, cd to the root of this repostory and execute
```
npm install
```
This will install all of the required modules automatically.

Next, we need to add the database and fill it with data. A database is assumed to be set up with a root user and empty password. Open up a terminal window and navigate to the MySQL install folder (for XAMPP on Windows it's `C:\xampp\mysql\bin\`). Now execute
```sh
mysql -u root < "path/to/sql/createdatabase.sql"
```
This will create a new database with alll the required tables. Now we need to insert all the data. Execute
```sh
mysql -u root < "path/to/sql/insertdata.sql"
```
## Running the server
The API server will run on port 4002 by default. It is possible to change the port number. To do so, open up config.json and change it yo something you prefer.

Assuming everything went accordingly, we can now run the server. Open a terminal window, cd to the root of this repository and execute
```
node index.js
```
There will be a confirmation message that the server has started running and has succesfully connected to the database.

## Interfacing with the API

### Root endpoint
To get an overview of available endpoints and request methods, issue a GET request to the root endpoint `localhost:$port/api`. This will return a JSON message.

### Request header usage
Every other request than to the root endpoint requires the use of proper Accept headers (that is, accepting either `application/xml`, `application/json` or both). Failing to do so will result in a 406 response returned with an appropriate error message. The same is true for sending data. Data sent to the server is assumed to be in the request body, and not including the proper Content-Type header will result in a 415 response with an appropriate error message.

### Response headers
Upon every succesful GET request, the Link response header will contain a link to the validation schema for the requested data. Upon a succesful POST or PUT request, the Location response header will containt a link to the created or updated resource. Do note that all links returned in response headers are relative to the root endpoint.