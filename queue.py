import re
import json
import iron_mq

f = open("user_timeline.json", "r")
dump = f.read()
f.close()

tweets = json.loads(dump)

urls = []

mq = iron_mq.IronMQ()

for tweet in tweets:
    urls.append(re.search("(?P<url>https?://[^\s]+)", tweet["text"]).group("url"))
    if len(urls) > 100:
        mq.postMessage("newsyurls", urls)
	urls = []
if len(urls) > 0:
	mq.postMessage("newsyurls", urls)
