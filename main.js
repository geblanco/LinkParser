var utils		  = require( __dirname + '/downloader/utils.js'),
	provider	  = require( __dirname + '/downloader/web-functions/seriesyonkis.js'),
	async		  = require( 'async' ),
	URL 	      = require( 'url' ),
	htmlparser 	  = require( 'htmlparser2' ),
	cli     	  = require('cli-color'),
	debug		  = false;

var manageMidWare = function( err, results ) {
	if ( err ) {
		console.log(cli.red('midQueue problem: ', err));
	} else {

		var _ = utils.downloader(results);
		async.waterfall([_.download, utils.endValidator], function ( err, ret ) {

			if ( err ) {
				console.log(cli.red('post link problem: ', err));
			} else {
				if ( !ret ) {
					//************OUTPUT POINT****************
					console.log( debug ? ('Cool link: ' + results) : ( results ) );
				}
			}
		});
	}
};

var midQueue = async.queue( function( task, callback ) {
	var _ = utils.downloader( URL.resolve(baseUrl, task.src) );
	async.waterfall([ _.download, function( html, callback ) {
		provider.prepareMidWare( task.server, html, callback );
	}], manageMidWare);
	
	//If we don't call this function we just process $concurrent links
	callback();

}, 400);

var midStage = function ( err, results ) {
	if ( err ) {
		console.log(cli.red('Main url parse error\n', err));
	} else {
		//Table with links
		//Filter by lang moment inside
		provider.prepareEpisodes( results, midQueue, function( err, episodes ) {
			async.each( 
				episodes,
				function( episode, callback ) {
					var _ = utils.downloader( URL.resolve(baseUrl, episode.src) );
					async.waterfall([ _.download, function( html, callback ) {
						provider.prepareMidWare( episode.server, html, callback );
					}], function( err, results ) {
						manageMidWare( err, results );
						callback( null );
					});
				}, function() {}
			);
		}, lang);
	}
};

var usage = function() {
	console.log('Usage: linkparser.js url [lang]');
};

//*****************ENTRY POINT****************
if ( process.argv.length < 3 ) {
	usage();
	process.exit( 1 );
}

var baseUrl = process.argv[2],
	lang 	= process.argv[3] || 'English',
	_ 		= utils.downloader(baseUrl);

if (lang == 'esp' || lang == 'sp' || lang == 's') {
	lang = 'Español';
};

console.log( 'Catched: ' + baseUrl );
async.waterfall([_.download, provider.parseEpisodeTable], midStage);









