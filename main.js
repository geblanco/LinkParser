var utils		  = require( __dirname + '/downloader/utils.js'),
	provider	  = require( __dirname + '/downloader/web-functions/seriesyonkis'),
	async		  = require( 'async' ),
	URL 	      = require( 'url' ),
	htmlparser 	  = require( 'htmlparser2' ),
	cli     	  = require('cli-color'),
	fs 			  = require('fs'),
	SHOW 		  = '__unknown__';

var manageMidWare = function( err, results, callback ) {
	if ( err ) {
		console.log(cli.red('midQueue problem: ', err));
	} else {

		var _ = utils.downloader(results);
		var endValidator = utils.endValidator;
		async.waterfall([_.download, endValidator], callback);
	}
};

// Each task has a visualization server link
// Download it, extract the real server link 
// (go through the midWare) and validate it (utils filter)
var midQueue = async.queue( function( task, callback ) {

	var _ = utils.downloader( URL.resolve(baseUrl, task.src) );
	var midWare = utils.filterMidWare( task );
	//download().prepareMidWare().download().parseEnd()
	async.waterfall([ _.download, provider.prepareMidWare, midWare.filter ], function( err, results ){

		manageMidWare( err, results, function( err, link ){

			if ( err ) {
				console.log(cli.red('post link problem: ', err));
			} else {
				//************OUTPUT POINT****************
				console.log(cli.green('Cool link: ' + results));
				_appendLink( task.epNo + '/links.txt', (results + '\n') );
			}

		}) 

	});
	
	//If we don't call this function we just process $concurrent links
	callback();

}, 40);

// Receives a raw table full of visualization links
// Parse it and enqueue each link
var midStage = function ( err, results, number ) {

	if ( err ) {
		console.log(cli.red('Main url parse error\n', error));
	} else {
		//Table with links
		//Filter by lang moment inside
		provider.prepareTable( results, midQueue, lang, provider.TABLE_TYPE.LINKS, number );
	}
};

// Queue for processing each episode.
// Each task has a link to a the episode visualization links table  
// (the provider middle ware, actually, which in turn gets you to the server)
var episodeQueue = async.queue( function( task, callback ) {

	var _ = utils.downloader( URL.resolve(baseUrl, task.src) );
	async.waterfall([ _.download, provider.parseTable ], function( err, results ){

		midStage( err, results, task.epNo )

	});
	_makeFolder( task.epNo );
	//If we don't call this function we just process $concurrent links
	callback();

}, 40);

// Receives a table full of links of all the episodes in a season 
var firstStage = function ( err, results ) {
	//console.log('firstStage', results);
	if ( err ) {
		console.log(cli.red('Main url parse error\n', error));
	} else {
		//Table with episode links 
		provider.prepareTable( results, episodeQueue, lang, provider.TABLE_TYPE.EPISODES );
	}
};

// Extract show name, stablishes the root folder
var _parseShow = function( url ){
	// Extract season by show
	
	var r = url.split('/');
	r = r[ r.length -1 ];
	r = r.split('.');
	r = r[ 0 ];
	return r;
}

// Create a folder with the given name at the root of the project
// Used to create downloads root and its subfolders
// Each episode creates its own folder  
var _makeFolder = function( src ){
	console.log('_makeFolder', 'src', src, 'folder', __dirname + '/' + SHOW + ((src)?( '/' + src ):''));
	if( FS ){

		var folder = __dirname + '/' + SHOW + ((src)?( '/' + src ):'');
		fs.mkdir(folder, function( err, stat ){
			if( err ) console.log(cli.red('Unable to prepare folder for', folder));
			else console.log(cli.green('Created folder for', folder));
		})

	}

}

// Given a string (link) and a file, 
// append the string at the end of the file
var _appendLink = function( file, content ){

	if( FS ){

		var folder = __dirname + '/' + SHOW + '/' + file;
		fs.appendFile( folder, content, { encoding: 'utf8' }, function( err ){
			if( err ) console.log(cli.red('Unable to append link to file', err, folder));
		})
	
	}

}

var usage = function() {
	console.log(
		'Usage: node linkparser.js url [lang] [OPTS] []'
		//, '\n\t[episode | season] Whether the provided url is the season (parse every episode of the season)'
		//, '\n\tor just an episode for extracting its links'
		//, '\n\tDefaults to episode'
		, '\n\n\t[FS boolean] Whether to save results or just print them (defaults to true)'
	);
};

//*****************ENTRY POINT****************
if ( process.argv.length < 3 ) {
	usage();
	process.exit( 1 );
}

// Parse link to get provider, used for requiring the appropriate script
var tmp = URL.parse( process.argv[2] );
tmp = tmp.hostname.split('.');

if( tmp.length > 2 ){
	console.log(tmp);
	try{
		var t = require( __dirname + '/downloader/web-functions/' + tmp[ 1 ] );
		provider = t;
		console.log('Provider found, using "' + tmp[ 1 ] + '"');
	}catch(e){
		console.log('Provider not found, falling back to default');
	}
}

var baseUrl	= process.argv[2];
var lang	= process.argv[3] || null;//'English';
var _		= utils.downloader(baseUrl);
SHOW		= _parseShow( baseUrl );
var FS 		= process.argv[4] || true;

if (lang == 'esp' || lang == 'sp' || lang == 's') {
	lang = 'es';
};

console.log( 'Catched: ' + baseUrl, 'show', SHOW );
// Prepare fs for this season
_makeFolder();

async.waterfall([_.download, provider.parseTable], firstStage);
//async.waterfall([_.download, provider.parseTable], midStage);