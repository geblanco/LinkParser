var request  	= require('request');
var cli		 	= require('cli-color');
var htmlparser 	= require( 'htmlparser2' );
var agent 		= 'Mozilla/5.0 (X11; Linux x86_64; rv:44.0) Gecko/20100101 Firefox/44.0';
var reqOpts 	= { headers: { 'User-Agent': agent } };

module.exports.downloader = function( url ) {

	this.url = url;
	
	return {
		download : function( callback ) {
			//console.log('downloading', url);
			if ( !url ) {
				return callback( 'Must provide both url and filename' );
			}
			request( url, reqOpts, function( error, response, body ) {
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