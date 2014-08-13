var NetCDFParser = require( './lib/allimaavenue.parser.js' )
var LoggingStream = require( './lib/allimaavenue.logging.js' )

var show = require( 'ndarray-show' );
var util = require( 'util' );
var fs = require( 'fs' );

//var files = [ 'madis-maritime.nc' ];
//var files = [ 'testrh.nc' ];
//var files = [ 'IDV71000_VIC_T_SFC.nc' ];
//var files = [ 'IDV71006_VIC_Wind_Mag_SFC.nc' ];
//var files = [ 'ECMWF_ERA-40_subset.nc' ];
var files = [ 'IDV71090_VIC_DailyPoP_SFC.nc' ];

var options = {
  //debug : false,
  //treat : function ( val ) {
  //  return Math.round( 10 * val ) / 10
  //}
};

for ( var i = 0; i < files.length; i++ ) {
  fs.createReadStream( files[i], { } )
    .pipe( new NetCDFParser(  )
             .on( 'model', function ( header ) {
                    console.log( util.inspect( header, true, 5 ) );
                  } )
             .on( 'variable', function ( header ) {
                    console.log( util.inspect( header, true, 5 ) );
                  } )
  );
  //.pipe( new LoggingStream() )
  //.pipe( process.stdout )
}

//process.stdin.pipe( new LoggingStream() ).pipe( process.stdout )
