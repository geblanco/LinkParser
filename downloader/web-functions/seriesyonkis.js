var htmlparser = require('htmlparser2'),
	select     = require('soupselect').select;


//Private helper functions
var _urlParser = function( src ) {

	if ( !src ) {
		return null;
	} else {

		var i = 0;
		for (; i < src.children.length && src.children[ i ].name != 'a'; i++);
		
		if ( i === src.length ) {
			return null;
		} else {
			return src.children[ i ].attribs.href;
		}
	}

};

var _serverParser = function( server ) {

	if ( !server ) {
		return null;
	} else {

		var i = 0;
		for (; i < server.children.length && server.children[ i ].name != 'a'; i++);
		
		if ( i === server.length ) {
			return null;
		} else {
			if ( server.children[ i ].children.length > 0 ) {
				var j = 0;
				for (; j < server.children[ i ].children.length && 
						   server.children[ i ].children[ j ].name != 'img'; 
						j++
					);
				if (j === server.children[ i ].children.length) {
					return null;
				} else {
					return server.children[ i ].children[ j ].attribs.alt || server.children[ i ].children[ j ].attribs.src || null;
				}
			}
			return null;
		}
	}

};

var _langParser = function( lang ) {
	
	if ( !lang ) {
		return null;
	} else {

		var i = 0;
		for (; i < lang.children.length && lang.children[ i ].name != 'span'; i++);
		
		if ( i === lang.length ) {
			return null;
		} 
		else {
			return lang.children[ i ].attribs.title || null;
		}
	}
	
};

var _episode = function( item ) {
	
	this.src	= _urlParser( item.src );
	this.server	= _serverParser( item.server );
	this.lang	= _langParser( item.lang );
	this.valid  = !!(this.src && this.server && this.lang);

};

//Public functions
module.exports = {
	//============Web dependant============
	prepareEpisodes : function( table, queue, callback, language ) {

		var handler = new htmlparser.DefaultHandler(function( err, dom ) {
			if ( err ) {
				return callback( err );
			} else {
				var rows = select( dom, 'tr' );
				
				rows.forEach(function( item, idx, arr ) {
					
					var col = select( item.children, 'td' );
					if ( (col instanceof Array) && col.length > 2 ) {
						//Filter by lang moment
						if ( language ) {
							var l = _langParser(col[2]);
							if ( l === language ) {
								queue.push( new _episode({ src: col[0], server: col[1], lang: col[2] }), function(err){} );
							}
						} else {
							queue.push( new _episode({ src: col[0], server: col[1], lang: col[2] }), function(err){} );
						}
					} 

				});
				return callback( null );
			}
		});

		var parser = new htmlparser.Parser( handler );
		parser.parseComplete(table);

	},
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
	},
	parseEpisodeTable : function( htmll, callback ) {
			
		var html = htmll + '';

		if ( html.length > 0 ) {
			var tableStart = html.indexOf( '<tbody>' );/*'<table class="episodes series">' ),*/
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

	}
	//====================================
}