const fs = require('fs');
const http = require('http');
const uuidv4 = require('uuid/v4');
const request = require('request');
const nodemailer = require('nodemailer');

const jobIpAddress = '192.168.0.20';
const jobPortNum = 3000;
const jobId = 'd8980d51-e334-4397-ad05-8029a8736440';
const jobName = 'ip-address-watcher'
const ipApiUrl = 'https://api.ipify.org/?format=json';

function findExternalIp() {
	return new Promise((resolve, reject) => {
		request(ipApiUrl, (error, response, body) => {
			if (error) reject(error);
			if (response.statusCode != 200) {
				reject('Invalid status code <' + response.statusCode + '>');
			}
			resolve(body);
		});
	});
}

function sendNotificationOfIpChange(newIp) {
	var mailOptions = {
		from: '',
		to: '',
		subject: 'Home IP Address Has Changed',
		text: 'New IP address is: '+ newIp
	};
	
	nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: '',
			pass: ''
		}
	}).sendMail(mailOptions, function(error, info){
		if (error) {
		console.log(error);
		} else {
		console.log('Email sent: ' + info.response);
		}
	});
}

let app = http.createServer(async (req, res) => {
	//if (req.method != 'POST' || req.url != '/ip-address-watcher/start-job') {
	if (req.url != '/ip-address-watcher/start-job') {
		console.log('A request was rejected for ' + req.method + ' ' + req.url);
		res.writeHead(404);
		res.end();
		return;
	}
	
	// Init
	var hrstart = process.hrtime();
	var startTime = new Date();
	var runId = uuidv4();
	var needsAlertSent = false;
	
	// find external ip synchronously
	var ipApiInfo = JSON.parse(await findExternalIp());
	
	// find last external ip synchronously and determine if they match
	var pathLastIpAddr = process.cwd() + '/data/lastIpAddr';
	
	if (!fs.existsSync(pathLastIpAddr)) {
		//console.log('Temp file lastIpAddr doesn\'t exist. Alerting and creating one');
		fs.writeFileSync(pathLastIpAddr, ipApiInfo.ip);
		sendNotificationOfIpChange(ipApiInfo.ip);
		needsAlertSent = true;
	} else {
		var contents = fs.readFileSync(pathLastIpAddr);
		if (contents == '') {
			//console.log('Temp file lastIpAddr is empty. Alerting and updating file');
			fs.writeFileSync(pathLastIpAddr, ipApiInfo.ip);
			sendNotificationOfIpChange(ipApiInfo.ip);
			needsAlertSent = true;
		} else if (contents != ipApiInfo.ip) {
			//console.log('Temp file lastIpAddr has an old ip (old: '+ contents + ', new: ' + ipApiInfo.ip + '). Alerting and updating file');
			fs.writeFileSync(pathLastIpAddr, ipApiInfo.ip);
			sendNotificationOfIpChange(ipApiInfo.ip);
			needsAlertSent = true;
		}
	}
	
	var hrend = process.hrtime(hrstart);
	var endTime = new Date();
	var executionTime = hrend[0].toString() + 's ' + (hrend[1]/1000000).toString() + 'ms'
	
	var jobResults = {
		"jobId": jobId,
		"jobName": jobName,
		"runId": runId,
		"status": "success",
		"startTime": startTime.toISOString(),
		"endTime": endTime.toISOString(),
		"executionTime": executionTime,
		"data": {
			"externalIp": ipApiInfo.ip,
			"alertWasSent": needsAlertSent
		}
	};
	
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.write(JSON.stringify(jobResults));
	
	res.end();
});

// Start the server on port 3000
app.listen(jobPortNum, jobIpAddress);  
console.log('Node server running on port ' + jobPortNum);  