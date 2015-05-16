var request  = require('request'),
	cli		 = require('cli-color'),
	htmlparser 	  = require( 'htmlparser2' );

module.exports.downloader = function( url ) {

	this.url = url;
	
	return {
		download : function( callback ) {
		
			if ( !url ) {
				return callback( 'Must provide both url and filename' );
			}
			request( url, function( error, response, body ) {
				if ( !error && response.statusCode === 200 ) {
					callback( null, body);
				} else {
					console.log(cli.yellow('Broken link, url:' + url + '\n'), cli.red(error));
					callback( null, '' );
				}
			});

		}
	}
};

module.exports.filterMidWare = function( item ){ 

	this.item = item;

	return {
		filter: function( input, callback ) {
			var i = 0;
			for ( ; i < input.length && ( input[i].attribs.href.indexOf(item.server) === -1 ); i++);
			if ( i === input.length ) {
				callback('MidWare link not found');
			} else {
				callback( null, input[i].attribs.href );
			}
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