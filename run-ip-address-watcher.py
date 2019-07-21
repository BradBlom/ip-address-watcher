# This file is a very basic demonstration of how to use this job.
# This file can be run on a schedule with cron
import requests

# modify these variables to suit your environment
strJobListener = 'http://192.168.0.20:3000/ip-address-watcher/start-job'
strLogLocation = '/home/pi/share/ip-address-watcher/ip-address-watcher.log'

print('Starting job: {}'.format(strJobListener))
res = requests.get(strJobListener)

print('Status code: {}'.format(res.status_code))
print('Response body: {}'.format(res.content.decode("utf-8")))

f=open(strLogLocation, 'a+')
f.write("Status code: {}\rResponse body: {}\r\r".format(res.status_code, res.content.decode("utf-8")))
f.close() 