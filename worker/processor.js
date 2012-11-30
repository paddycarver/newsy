var phantom = require('phantom');
var fs = require('fs');
var http = require('http');
var querystring = require('querystring');
var knox = require('knox');
var mq = require("iron_mq");
var detaco = require("detaco");
var request = require("request");
var path = require("path");
var mime = require("mime");

var payloadIndex = -1;
process.argv.forEach(function(val, index, array) {
  if (val == "-payload") payloadIndex = index + 1;
});
var payload = JSON.parse(fs.readFileSync(process.argv[payloadIndex]));

console.log("payload:", payload);

var client = new mq.Client({"queue_name": "newsyurls"});
for(i = 0; i < 5; i++){
client.get({}, function(e, b) {
  if(e != null || b == null) {
    console.log(e);
    process.exit(1);
  }

  detaco.resolve_url(b["body"], function(detacod) {
    var url = detacod;
    console.log(url);
/*
 * Render page to .png image file
 */
var filename = encodeURIComponent(url) + '.png';
var output = __dirname + '/' + filename;
phantom.create(function(ph) {
  // failsafe - exit for no reason after 10 minutes
  var timeout = setTimeout(function () {
    console.error("Something bad happened.");
    ph.exit();
    process.exit(1);
  }, 600000);
  ph.createPage(function(page) {
    page.viewportSize = { width: 800, height: 800 };
    return page.open(url, function(status) {
      if (status !== 'success') {
        console.error('Unable to load the address!');
      } else {
        page.render(output, function(){
          console.log("page rendered to " + output);
	  ph.exit();
          upload(output, payload["box"]["folder_id"], payload["box"]["api_key"], payload["box"]["auth_token"], url);
	  clearTimeout(timeout);
        });
      }
    });
  });
});
});
});
}

var pushLink = function(link, source) {
  var req = request.post("http://iron-ehd.appspot.com/callback/" + encodeURIComponent(payload["session"]), function(e, r, body) {
    if(e != null) {
      console.log(e);
    }
    if(body != null) {
      console.log(body);
    }
  });
  form = req.form();
  form.append('img', encodeURIComponent(link));
  form.append('url', encodeURIComponent(source));
}

var getLink = function(file_id, api_key, auth_token, source) {
  var headers = {
    'Authorization': 'BoxAuth api_key='+api_key+'&auth_token='+auth_token
  };
  var req = request.put({url: 'https://api.box.com/2.0/files/'+file_id, headers:headers, body: JSON.stringify({"shared_link": {"access": "Open"}})}, function(e, r, body) {
    if(e != null) {
      console.log(e);
      return;
    }
    resp = JSON.parse(body);
    pushLink(resp.shared_link.download_url, source);
  });
};

var upload = function(file, folder_id, api_key, auth_token, source) {
  var headers = {
    'Authorization': 'BoxAuth api_key='+api_key+'&auth_token='+auth_token
  };
  var req = request.post({url:'https://api.box.com/2.0/files/content', headers:headers}, function(e, r, body) {
    if(e != null) {
      console.log(e);
      return;
    }
    resp = JSON.parse(body);
    getLink(resp.entries[0].id, api_key, auth_token, source);
  });
  form = req.form();
  form.append('filename1"; filename="'+String(Math.round(new Date().getTime() / 1000))+path.basename(file)+'"\r\nContent-Type: "'+mime.lookup(file), fs.readFileSync(file));
  form.append('folder_id', folder_id);
  req.setHeader("Content-Length", form.getLengthSync());
};
