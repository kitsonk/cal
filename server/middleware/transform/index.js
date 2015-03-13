var util = require('util'),
	stream = require('stream');

var TransformStream = function (fn, req) {
	this.fn = fn;
	this.req = req;
	this.readable = true;
	this.writable = true;
	this.chunks = [];
};

util.inherits(TransformStream, stream);

TransformStream.prototype.write = function (data) {
	this.chunks.push(data);
};

TransformStream.prototype.end = function () {
	var data = this.fn(Buffer.concat(this.chunks), this.req);
	this.emit('data',data);
	this.emit('end');
};

function init(options) {
	return function transform(req, res, next) {
		var transformStream = new TransformStream(function (data) {
			var reg = /client\.nowtv\.com/g;
			data = data.toString().replace(reg, 'localhost:3000');
			return new Buffer(data);
		});

		var resWrite = res.write.bind(res),
			resEnd = res.end.bind(res),
			resWriteHead = res.writeHead.bind(res);

		res.write = function (data, encoding) {
			transformStream.write(data, encoding);
		};

		res.end = function (data, encoding) {
			transformStream.end(data, encoding);
		};

		transformStream.on('data', function (data) {
			resWrite(data);
		});

		transformStream.on('end', function () {
			resEnd();
		});

		res.writeHead = function (code, headers) {
			res.removeHeader('Content-Length');

			if (options.headers) {
				options.headers.forEach(function (header) {
					if (header.value) {
						res.setHeader(header.name, header.value);
					}
					else {
						res.removeHeader(header.name);
					}
				});
			}

			if (headers) {
				delete headers['content-length'];
			}
			resWriteHead.apply(null, arguments);
		};

		next();
	};
}

/**
 *  Export API
 */
module.exports = function (options) {
	options = options || {};
	return init(options);
};
