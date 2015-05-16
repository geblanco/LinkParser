var utils		  = require( __dirname + '/downloader/utils.js'),
	provider	  = require( __dirname + '/downloader/web-functions/seriesyonkis.js'),
	async		  = require( 'async' ),
	URL 	      = require( 'url' ),
	htmlparser 	  = require( 'htmlparser2' ),
	cli     	  = require('cli-color');

var manageMidWare = function( err, results ) {
	if ( err ) {
		console.log(cli.red('midQueue problem: ', err));
	} else {

		var _ = utils.downloader(results);
		var endValidator = utils.endValidator;
		async.waterfall([_.download, endValidator], function ( err, ret ) {

			if ( err ) {
				console.log(cli.red('post link problem: ', err));
			} else {
				if ( !ret ) {
					//************OUTPUT POINT****************
					console.log('Cool link: ' + results);
				}
			}
		});
	}
};

var midQueue = async.queue( function( task, callback ) {

	var _ = utils.downloader( URL.resolve(baseUrl, task.src) );
	var midWare = utils.filterMidWare( task );
	//download().prepareMidWare().download().parseEnd()
	async.waterfall([ _.download, provider.prepareMidWare, midWare.filter ], manageMidWare);
	
	//If we don't call this function we just process $concurrent links
	callback();

}, 40);

var midStage = function ( err, results ) {
	if ( err ) {
		console.log(cli.red('Main url parse error\n', error));
	} else {
		//Table with links
		//Filter by lang moment inside
		provider.prepareEpisodes( results, midQueue, function( err ) {}, lang);
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

console.log( 'Catched: ' + baseUrl );
async.waterfall([_.download, provider.parseEpisodeTable], midStage);