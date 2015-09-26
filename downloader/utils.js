var request  = require('request'),
	cli		 = require('cli-color'),
	htmlparser 	  = require( 'htmlparser2' ),
	jsdom 	 = require("jsdom");

module.exports.downloader = function( url ) {

	this.url = url;
	
	return {
		download : function( callback ) {
		
			if ( !url ) {
				return callback( 'Must provide both url and filename' );
			}
			request( url, function( error, response, body ) {
				if ( error ) {
					console.log(cli.yellow('Broken link, url:' + url + '\n'), cli.red(error));
					callback( error );
				} else if ( response.statusCode === 200 ) {
					jsdom.env({
					  	html: body,
					  	scripts: ["http://code.jquery.com/jquery.js"],
					  	done: function(err, window) {
					  		if ( err ) {
					  			return callback( err );
					  		}
					  		callback(null, window);
					  	}
					});

				}
			});
		}
	}
};

module.exports.endValidator = function( item, callback ) {

	var regex = /(copyright[\s]*infringement)|(404)|(removed)|(not[\s]*found)|(reason[\s]for[\s]deletion:[\s]expiration)/ig;
	var badLink = false;
	var parser = new htmlparser.Parser({
		ontext : function( text ) {

			if ( text.match( regex ) !== null) {
				badLink = true;
			}

		},
		onend : function() {
			callback( null, badLink );
		}
	});

	parser.parseComplete( item );

};