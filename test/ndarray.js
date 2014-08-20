var tape = require( 'tape' );

var unpack = require( 'ndarray-unpack' );
var pack = require( 'ndarray-pack' );

var find = require( '../lib/allimaavenue.ndarray.js' );


tape( "Simple find adjacent index with values above and below parameter", function( test ) {
  test.plan( 2 );

  test.deepEquals( find( pack( [ 0, 2 ] ), 1 ), [0, 1] );
  test.deepEquals( find( pack( [ 0, -2 ] ), -1 ), [0, 1] );

  test.end();
} );

tape( "Less simple find adjacent index with values above and below parameter", function( test ) {
  test.plan( 2 );

  test.deepEquals( find( pack( [ 0, 2, 5, 9, 4 ] ), 6 ), [2, 3] );
  test.deepEquals( find( pack( [ 0, -2, -5, 9, -4 ] ), 6 ), [2, 3] );

  test.end();
} );