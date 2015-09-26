var htmlparser = require('htmlparser2'),
	select     = require('soupselect').select,
	fs 		   = require('fs'),
	$		   = null;


//Private helper functions
var _urlParser = function( src ) {

	if ( !src ) {
		return null;
	} else {
		return $(src).find('a').attr('href');
	}

};

var _serverParser = function( server ) {

	if ( !server ) {
		return null;
	} else {
		return $(server).find('img').attr('alt');
	}

};

var _langParser = function( lang ) {
	
	if ( !lang ) {
		return null;
	} else {
		return $(lang).find('span').text() || $(lang).find('span').attr('tittle');
	}
	
};

//Public functions
module.exports = {
	//============Web dependant============
	setup: function( jquery ) { $ = jquery; },
	prepareEpisodes : function( tableBody, queue, callback, language ) {
		var rows 	= tableBody.find('tr');

		/*var src		= rows.find('.episode-server');
		var server 	= rows.find('.episode-server-img');
		var lang 	= rows.find('.episode-lang');

		for (var i = 0; i < src.length; i++) {
			var l = _langParser( lang[i] );
			var u  = _urlParser( server[i] );
			var s = _serverParser( server[i] );
			language = language || l;
			if ( language === l ) {
				queue.push({ src: u, server: s, lang: l, valid: !!(u && s && l)});
			}
		}*/
		var eps = [];
		// Parallelize as much as possible
		rows.each( function( idx, item ) {
			var u = _urlParser( $(item).find('.episode-server') );
			var s = _serverParser( $(item).find('.episode-server-img') );
			var l = _langParser( $(item).find('.episode-lang') );
			language = language || l;
			console.log('lang', l, 'server:', s, 'url:', u, 'language:', language);
			if ( language === l && !!(u && s && l) ) {
				eps.push({ src: u, server: s, lang: l });
				//queue.push({ src: u, server: s, lang: l });
			}
		});
		callback( null, eps );
	},

	prepareMidWare : function( url, html, callback ) {
		$ = html.$;
		var link = $("a[href*='" + url + "']");
		callback( null, $(link[0]).attr('href') );
	},

	// Fisrt entry point
	parseEpisodeTable : function( html, callback ) {
		$ = html.$;
		var tables = [];
		var tr = $("#section-content").children().each(function( idx, item ) {
			if ( $(item).is("table") ) {
				tables.push($(item));
			}
		});
		callback(null, tables[0].find("tbody"));
	}

}