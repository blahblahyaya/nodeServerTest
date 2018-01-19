const express = require('express')
const app = express()
var http = require('http')
var port = 3100
var url = require('url');
var querystring = require('querystring');
var apiSite = 'cortanadevapi.trafficmanager.net'
var clientPem = 'Prod-client.pem'
var unenKey = 'Prod-unen-key.pem'
var certEndPoint = "/api/v2/certification";
var skillsEndPoint = "/api/v2/skills";
var entitiesEndPoint = "/api/v2/entities/";
var env = process.env.NODE_ENV;

const https = require('https');
const fs = require('fs');

// NODE_ENV=production node server.ts
if ( env !== 'production') {
  require('dotenv').load();
  port = process.env.PORT
  apiSite = process.env.DEVSITE
  clientPem = 'Dev-client.pem'
  unenKey = 'Dev-unen-key.pem'
  require('longjohn');
}

var options = { 
    hostname: apiSite, 
    port: 443, 
    path: '',
    method: '',
    headers: {},
    passphrase: 'CortanaDev!123',
    key: fs.readFileSync('./assets/certs/' + unenKey), 
    cert: fs.readFileSync('./assets/certs/' + clientPem)
}; 
/*
// ensure req is from a valid source
var adal = require('adal-node').AuthenticationContext;

var authorityHostUrl = 'https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/oauth2/authorize';
var tenant = ''; // AAD Tenant name.
var authorityUrl = authorityHostUrl + '/' + tenant;
var applicationId = 'yourApplicationIdHere'; // Application Id of app registered under AAD.
var clientSecret = 'yourAADIssuedClientSecretHere'; // Secret generated for app. Read this environment variable.
var resource = '00000002-0000-0000-c000-000000000000'; // URI that identifies the resource for which the token is valid.

var context = new AuthenticationContext(authorityUrl);

context.acquireTokenWithClientCredentials(resource, applicationId, clientSecret, function(err, tokenResponse) {
  if (err) {
    console.log('well that didn\'t work: ' + err.stack);
  } else {
    console.log(tokenResponse);
  }
});
*/

var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers","Origin, Authorization, X-Requested-With, Content-Type, Accept");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

if (env !== 'production') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message, 
            error: err
        });
     });
 }
 app.use(function(err, req, res, next) {
    // Do logging and user-friendly error message display
    console.error('logged error: ',err);
    res.status(500).send('internal server error');
  });

app.get('/', (request, response) => {
  response.send('Hello from Cert Admin!')
})

// cert list
app.get('/api/v2/certification', (request, response) => {

    var nextParam = '';
    var sizeParam = '';

    var thePath = certEndPoint;

    if (typeof request.query != 'undefined') {
        if (querystring.stringify(request.query) != '') {
            thePath = thePath + '?' + querystring.stringify(request.query); // pass on the qs parameters
        }
    }
    
    var output = {
        next: '',
        size: '',
        data: ''
    };

    options.path = thePath;
    options.method = 'GET';

    var req = https.request(options, function(res) { 
        var payload = "";
        res.on('data', function(data) { 
            payload += data;
        }); 
        res.on('end', function() {
            output.data = JSON.parse(payload);
        
            if (typeof res.headers.link != 'undefined') {
                var url_parts = url.parse(res.headers.link, true);
                var query = url_parts.query;
                output.next = query.next;
                output.size = query.size;
            }
            response.send(output);
        });
    }); 
    
    req.end();
});

// get single cert skill
app.get('/api/v2/certification/:locale/:skillId', (request, response) => {

    var output = "";
    var thePath = "";

    if (typeof request.query != 'undefined') {
            thePath = certEndPoint + '/' + request.params.locale + '/' + request.params.skillId;
        }

    console.log('get', thePath);
    
    options.path = thePath;
    options.method = 'GET';

    var req = https.request(options, function(res) { 
        var payload = "";
        res.on('data', function(data) { 
            payload += data;
        }); 
        res.on('end', function() {
            response.send(payload);
        });
    }); 
    req.end();
})

// update single cert skill record
app.put('/api/v2/certification/:skillId', (request, response) => {

    var output = "";

    var skill = request.body;

    var skillId = request.params.skillId;

    var thePath = certEndPoint + '/' + skill.locale + '/' + skillId;
    
    var bodyString = JSON.stringify(skill);
    var bufferLength = bodyString.length;
    
    console.log('put', thePath);

    options.headers = {
        'Content-type': 'application/json',
        'Content-Length': bodyString.length
    };
    options.path = thePath;
    options.method = 'PUT';

    var req = https.request(options, function(res) { 
        var payload = "";
        res.on('data', function(data) { 
            payload += data;
        }); 
        res.on('end', function() {
            output = JSON.parse(payload);
            response.send(output);
        });
    }).write(bodyString); 
})

// delete single cert skill record
app.delete('/api/v2/certification/:locale/:skillId', (request, response) => {
  
    var output = "";
    var thePath = "";

    if (typeof request.query != 'undefined') {
        if (request.query.next) {
            thePath = certEndPoint + '/' + request.params.skillId + '/?next=' + request.query.next;
        } else {
            thePath = certEndPoint + '/en-us/' + request.params.skillId;
        }
    }

    console.log('delete', thePath);

    options.path = thePath;
    options.method = 'DELETE';

    var req = https.request(options, function(res) { 
        var payload = "";
        res.on('data', function(data) { 
            payload += data;
        }); 
        res.on('end', function() {
            response.send(payload);
        });
    }); 
    req.end();
})

// insert single cert skill
app.post('/api/v2/certification', (request, response) => {
    
    var output = "";

    var skill = request.body;
    
    var skillId = request.params.skillId;
    
    var thePath = certEndPoint + '/' + skill.locale;
    
    var bodyString = JSON.stringify(skill);
    var bufferLength = skill.length;
    
    console.log('post', thePath);

    options.headers = {
        'Content-type': 'application/json',
        'Content-Length': bodyString.length
    };
    options.path = thePath;
    options.method = 'POST';

    var req = https.request(options, function(res) { 
        var payload = "";
        res.on('data', function(data) { 
            payload += data;
        }); 
        res.on('end', function() {
            response.send(res);
        });
    }).write(bodyString); 
})

// Skill Put
// [Route("{stage}/{id}")]
// update single skill  
app.put('/api/v2/skills/:stageId/:skillId', (request, response) => {

    var output = "";

    var skill = request.body;

    var skillId = request.params.skillId;
    var stageId = request.params.stageId;
    var stageName = '';
    
    switch(stageId) {
        case 4:
            stageName = 'prod';
            break;
        case 3:
            stageName = 'group';
            break;
        case 1:
            stageName = 'self';
            break;
        default:
            stageName = 'prod'; 
    }

    var thePath = skillsEndPoint + '/' + stageName + '/' + skillId;
    
    var bodyString = JSON.stringify(skill);
    var bufferLength = bodyString.length;
    
    console.log('put ', thePath);
/*
    var options = { 
        hostname: apiSite, 
        port: 443, 
        path: thePath, 
        method: 'PUT', 
        headers: {
            'Content-type': 'application/json',
            'Content-Length': bodyString.length
        },
        passphrase: 'CortanaDev!123',
        key: fs.readFileSync(unenKey), 
        cert: fs.readFileSync(clientPem)
    }; 
*/
    options.headers = {
        'Content-type': 'application/json',
        'Content-Length': bodyString.length
    };
    options.path = thePath;
    options.method = 'PUT';

    var req = https.request(options, function(res) { 
        var payload = "";
        res.on('data', function(data) { 
            payload += data;
        }); 
        res.on('end', function() {
            if (res.statusCode === 400 ) {
                console.log('error');
                response.statusCode = res.statusCode;
                response.statusMessage = res.statusMessage;
            }
            output = JSON.parse(payload);

            response.send(output);
        });
    }).write(bodyString);
})
//skill routes
// Base URL: api/v2/skills

// get skills 
app.get('/api/v2/skills/', (request, response) => {

    var output = "";
    var thePath = "";

    thePath = skillsEndPoint;

    console.log('get', thePath);

    options.path = thePath;
    options.method = 'GET';

    var req = https.request(options, function(res) { 
        var payload = "";
        res.on('data', function(data) { 
            payload += data;
        }); 
        res.on('end', function() {
            output = JSON.parse(payload);
            response.send(output);
        });
    }); 
    req.end();
})

app.get('/api/v2/skills/:stageId/:skillId', (request, response) => {

    var output = "";
    var thePath = "";

    if (typeof request.query != 'undefined') {
        thePath = skillsEndPoint + '/' + request.params.stageId + '/' + request.params.skillId;
    }

    console.log('get', thePath);

    options.path = thePath;
    options.method = 'GET';

    var req = https.request(options, function(res) { 
        var payload = "";
        res.on('data', function(data) { 
            payload += data;
        }); 
        res.on('end', function() {
            output = payload;
            
            response.send(output);
        });
    }); 
    req.end();
})


// show stages
app.get('/api/v2/skills/:skillId', (request, response) => {

    var output = "";
    var thePath = "";

    if (typeof request.query != 'undefined') {
        thePath = skillsEndPoint + '/' + request.params.skillId + '/stages';
    }

    console.log('get', thePath);

    options.path = thePath;
    options.method = 'GET';

    var req = https.request(options, function(res) { 
        var payload = "";
        res.on('data', function(data) {
            payload += data;
        }); 
        res.on('end', function() {
            output = JSON.parse(payload);
            response.send(output);
        });
    }); 
    req.end();
})

// api/v2/entities
// get entities
app.get('/api/v2/entities', (request, response) => {

    var output = "";
    var thePath = "";

    thePath = entitiesEndPoint;

    console.log('get', thePath);

    options.path = thePath;
    options.method = 'GET';

    var req = https.request(options, function(res) { 
        var payload = "";
        res.on('data', function(data) { 
            payload += data;
        }); 
        res.on('end', function() {
            output = payload;
            
            response.send(output);
        });
    }); 
    req.end();
})


http.createServer(app).listen(port, function(){
    console.log("Express server listening on port " + port);
  });