import requests

jobListener = 'http://192.168.0.20:3000/ip-address-watcher/start-job'

print('Starting job: {}'.format(jobListener))
res = requests.get(jobListener)

print('Status code: {}'.format(res.status_code))
print('Response body: {}'.format(res.content.decode("utf-8")))

f=open("/home/pi/share/ip-address-watcher/ip-address-watcher.log", "a+")
f.write("Status code: {}\rResponse body: {}\r\r".format(res.status_code, res.content.decode("utf-8")))
f.close() 