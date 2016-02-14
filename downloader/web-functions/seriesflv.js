var htmlparser = require('htmlparser2');
var select     = require('soupselect').select;
var TABLE_TYPE = {'LINKS': 0, 'EPISODES': 1};
var LANGS 	   = require('../langs.json');
var	noop 	   = function(){};

//Private helper functions
// Get episode visualization link
var _urlParser = function( src ) {

	if ( !src ) {
		return null;
	} else {

		var i = 0;
		for (; i < src.children.length && src.children[ i ].name != 'a'; i++);
		
		if ( i === src.children.length ) {
			return null;
		} else {
			return src.children[ i ].attribs.href;
		}
	}

};

var _extractServerFromLink = function( link ){
	// http://www.google.com/s2/favicons?domain=megalinks.io
	// Want to get "megalink"
	var aux = link.split('/');
	var ret = null;
	if( aux.length ){
		aux = aux[ aux.length -1 ];
		aux = aux.split('=');
		if( aux.length ){
			ret = aux[ aux.length -1 ];
		}
	}
	return ret;

};

// Get server name
var _serverParser = function( server ) {

	if ( !server ) {
		return null;
	} else {
		//console.log('server parser', server);
		var i = 0;
		for (; i < server.children.length && server.children[ i ].name != 'img'; i++);
		
		if ( i === server.children.length ) {
			return null;
		} else {
			return _extractServerFromLink( server.children[ i ].attribs.src );
		}
	}

};

var _extractLangFromLink = function( link ){

	// http://www.seriesflv.net/images/lang/es.png
	// Want to get "es"
	var aux = link.split('/');
	var ret = null;
	if( aux.length ){
		aux = aux[aux.length-1];
		aux = aux.split('.');
		if( aux.length ){
			ret = LANGS.hasOwnProperty( aux[ 0 ] ) ? LANGS[ aux[ 0 ] ] : null;
		}
	}
	return ret;

};

// Get episode lang
var _langParser = function( lang ) {
	//console.log('lang parser', lang);
	if ( !lang ) {
		return null;
	} else {
		// Lang is given as an image
		var i = 0;
		for (; i < lang.children.length && lang.children[ i ].name != 'img'; i++);
		
		if ( i === lang.children.length ) {
			return null;
		} 
		else {
			return _extractLangFromLink( lang.children[ i ].attribs.src );
		}
	}

};

// Object constructor for an episode
var _episode = function( item ) {
	
	this.src	= _urlParser( item.src );
	this.server	= _serverParser( item.server );
	this.lang	= _langParser( item.lang );
	this.valid  = !!(this.src && this.server && this.lang);

};

//Public functions
module.exports = {

	TABLE_TYPE: TABLE_TYPE,
	//============Web dependant============
	// Extract table from the hole html
	parseTable : function( htmll, callback ) {
			
		var html = htmll + '';

		if ( html.length > 0 ) {
			var tableStart = html.indexOf( '<tbody>' );
				tableEnd   = html.indexOf( '</tbody>' );

			//Try reading from middle file
			if ( tableStart != -1 && tableEnd != -1 ) {
				//http://stackoverflow.com/questions/16441770/split-string-in-two-on-given-index-and-return-both-parts
				var table = html.substring( tableStart, tableEnd );
				var episodes = table.substring( ( table.indexOf('<tr>') - 1 ) );
				callback( null, episodes);
			} else {
				callback( 'table not found' );
			}
		} else {
			callback( 'Empty html' );
		}
	},
	// Given a table, try parsing server | lang | link for each of its rows,
	// This is were the magic happens, is one the critical parts of the provider
	prepareTable : function( table, queue, language, type, linkNo ) {

		var handler = new htmlparser.DefaultHandler(function( err, dom ) {
			if ( err ) {
				return err;
			} else {

				var rows = select( dom, 'tr' );
				rows.forEach(function( item, idx, arr ) {
					
					var col = select( item.children, 'td' );
					if ( (col instanceof Array) && col.length > 2 ) {
						// We extract the links for current episode, one step to middleWare
						if( type === TABLE_TYPE.LINKS ){
							//Filter by lang moment
							// Order : Lang | Rubbish | Server | Link
							if ( language ) {
								var l = _langParser(col[2]);
								if ( l === language ) {
									var ep = new _episode({ src: col[3], server: col[2], lang: col[0] });
									if( ep.valid ){
										ep.epNo = linkNo || null;
										queue.push( ep, noop );
									/*}else{
										console.log('Unable to parse episode');*/
									}
								}
							} else {
								var ep = new _episode({ src: col[3], server: col[2], lang: col[0] });
								if( ep.valid ){
									ep.epNo = linkNo || null;
									queue.push( ep, noop );
								/*}else{
									console.log('Unable to parse episode');*/
								}
							}
						}else{
							// We extract a link for each espisode on this season
							// col[ 0 ] is the first column on the row, which usually holds the link
							//console.log('got a col', _urlParser( col[0] ));
							queue.push({ src: _urlParser( col[0] ), epNo: idx }, noop );
						}
					} 

				});
				return null;
			}
		});

		var parser = new htmlparser.Parser( handler );
		parser.parseComplete(table);
	},
	// Given the midware html, extract all hrefs (links) for filtering later on the filter
	prepareMidWare : function( item, callback ) {
		var handler = new htmlparser.DefaultHandler(function( err, item ) {
			if ( err ) {
				return callback( err );
			} else {
				var hrefs = select( item, 'a' );
				hrefs.forEach( function( i, idx ) {
					if ( !(i.attribs.hasOwnProperty('href')) ) {
						hrefs.splice(idx, 1);
					}
				})
				return callback( null, hrefs);
			}
		});

		var parser = new htmlparser.Parser( handler );
		parser.parseComplete( item );
	}
	//====================================
}