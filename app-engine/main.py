#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import webapp2
from google.appengine.ext.webapp import template
from google.appengine.api import channel
import iron_worker
import json
from datetime import datetime
import logging

class MainHandler(webapp2.RequestHandler):
    def get(self):
	session = datetime.now().isoformat(" ")
        token = channel.create_channel(session)
        template_values = {
            "session": session,
	    "token": token
	}
        self.response.out.write(template.render('template.html', template_values))        

class QueueHandler(webapp2.RequestHandler):
    def post(self, num="1"):
        session = self.request.get("session").strip()
	logging.info("%s", session)
	s3_key = ""
	s3_secret = ""
	s3_bucket = ""
	box_folder_id = ""
	box_api_key = ""
	box_auth_token = ""
	iron_project_id = ""
	iron_token = ""
	payload = {"session": session, "s3": {"key": s3_key, "secret": s3_secret, "bucket": s3_bucket}, "box": {"folder_id": box_folder_id, "api_key": box_api_key, "auth_token": box_auth_token}}
	worker = iron_worker.IronWorker(project_id=iron_project_id, token=iron_token)
	output = ""
	for n in range(int(num)):
	    output += json.dumps(worker.postTask("processor", payload))
	self.response.out.write(output)

class CallbackHandler(webapp2.RequestHandler):
    def post(self, session):
	data = {"img": self.request.get("img"), "url": self.request.get("url")}
	logging.info(session)
	logging.info(json.dumps(data))
        channel.send_message(session, json.dumps(data))

app = webapp2.WSGIApplication([('/', MainHandler),
	                       ('/queue/(.*)', QueueHandler),
			       ('/callback/(.*)', CallbackHandler)],
                              debug=True)
