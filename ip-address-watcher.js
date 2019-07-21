const config = require('config');
const fs = require('fs');
const http = require('http');
const uuidv4 = require('uuid/v4');
const request = require('request');
const nodemailer = require('nodemailer');

const jobIpAddress = config.get('app-main.listen-address');
const jobPortNum = config.get('app-main.listen-port');
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

function sendEmailSync(transport, mailOptions) {
	return new Promise((resolve, reject) => {
		transport.sendMail(mailOptions, (err, info) => {
			if (err) {
				console.log("error: ", err);
				reject(err);
			} else {
				console.log('Email sent: ' + info.response);
				resolve(info);
			}
		});
	});
}

async function sendNotificationOfIpChange(newIp) {
	var alertMedium = config.get('app-main.alert-medium');
	
	var sendAlertIsSuccess = false;
	
	if (alertMedium == 'email') {
		var mailOptions = {
			from: config.get('email-configs.from-email'),
			to: config.get('email-configs.to-email'),
			subject: 'Home IP Address Has Changed',
			text: 'New IP address is: '+ newIp
		};
		
		var transport = nodemailer.createTransport({
			service: config.get('email-configs.email-service'),
			auth: {
				user: config.get('email-configs.email-username'),
				pass: config.get('email-configs.email-password')
			}
		});
		
		var emailResponse = await sendEmailSync(transport, mailOptions);
		
		console.log(JSON.stringify(emailResponse));
		sendAlertIsSuccess = true;
	}
	
	return Boolean(sendAlertIsSuccess);
}

let app = http.createServer(async (req, res) => {
	if (req.method != 'POST' || req.url != '/ip-address-watcher/start-job') {
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
	var successfulAlertWasSent = false;
	
	// find external ip synchronously
	var ipApiInfo = JSON.parse(await findExternalIp());
	
	// find last external ip synchronously and determine if they match
	var pathLastIpAddr = process.cwd() + '/data/lastIpAddr';
	
	if (!fs.existsSync(pathLastIpAddr)) {
		needsAlertSent = true;
	} else {
		var contents = fs.readFileSync(pathLastIpAddr);
		if (contents == '') {
			needsAlertSent = true;
		} else if (contents != ipApiInfo.ip) {
			needsAlertSent = true;
		}
	}
	
	if (needsAlertSent) {
		fs.writeFileSync(pathLastIpAddr, ipApiInfo.ip);
		try {
			successfulAlertWasSent = await sendNotificationOfIpChange(ipApiInfo.ip);
		}
		catch(err) {
			successfulAlertWasSent = false;
		}
	}
	
	var hrend = process.hrtime(hrstart);
	var endTime = new Date();
	var executionTime = hrend[0].toString() + 's ' + (hrend[1]/1000000).toString() + 'ms'
	
	var jobStatus;
	var jobStatusMessage;
	if (needsAlertSent && successfulAlertWasSent) {
		jobStatus = 'success';
		jobStatusMessage = 'Alert was successfully sent';
	} else if (needsAlertSent && !successfulAlertWasSent) {
		jobStatus = 'fail';
		jobStatusMessage = 'Alert failed to be sent';
	} else {
		jobStatus = 'success';
		jobStatusMessage = 'No alerts are necessary';
	}
	
	var jobResults = {
		"jobId": jobId,
		"jobName": jobName,
		"runId": runId,
		"status": jobStatus,
		"statusMessage": jobStatusMessage,
		"startTime": startTime.toISOString(),
		"endTime": endTime.toISOString(),
		"executionTime": executionTime,
		"data": {
			"externalIp": ipApiInfo.ip,
			"alertWasSent": successfulAlertWasSent
		}
	};
	
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.write(JSON.stringify(jobResults));
	
	res.end();
});

// Start the server on port 3000
app.listen(jobPortNum, jobIpAddress);  
console.log('Node server running on port ' + jobPortNum);  