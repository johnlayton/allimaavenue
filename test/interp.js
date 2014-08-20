var tape = require( 'tape' );

var unpack = require( 'ndarray-unpack' );
var pack = require( 'ndarray-pack' );

var interp = require( '../lib/allimaavenue.interp.js' );


tape( "Simple simple hi/lo", function ( test ) {
  test.plan( 1 );

  var nd = pack( [
                   [ 1, 2, 3 ],
                   [ 4, 5, 6 ],
                   [ 7, 8, 9 ]
                 ] );
  var idx = [
    [ 1, 2 ],
    [ 0, 1 ]
  ];

  test.deepEquals( unpack( interp( nd, idx ) ), [
    [ 4, 5 ],
    [ 7, 8 ]
  ] );

  test.end();
} );

tape( "Simple less simple hi/lo", function ( test ) {
  test.plan( 1 );

  var nd = pack( [
                   [
                     [ 1, 2, 3 ],
                     [ 4, 5, 6 ],
                     [ 7, 8, 9 ]
                   ],
                   [
                     [ 11, 12, 13 ],
                     [ 14, 15, 16 ],
                     [ 17, 18, 19 ]
                   ]
                 ] );
  var idx = [
    [ 0, 1 ],
    [ 1, 2 ],
    [ 1, 2 ]
  ];

  test.deepEquals( unpack( interp( nd, idx ) ), [
    [
      [ 5, 6 ],
      [ 8, 9 ]
    ],
    [
      [ 15, 16 ],
      [ 18, 19 ]
    ]
  ] );

  test.end();
} );
