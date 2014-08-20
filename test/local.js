var tape = require( 'tape' );
var fs = require( 'fs' );
var path = require( 'path' );
var unpack = require( 'ndarray-unpack' );

var NetCDFParser = require( '../lib/allimaavenue.parser.js' );
//var LoggingStream = require( '../lib/allimaavenue.logging.js' );

var check_header = function ( test, header, expected ) {
  expected = expected || {};
  test.plan( 5 );
  test.equal( header.title, expected.title || "CDF" );
  test.equal( header.version, expected.version || 1 );
  test.deepEqual( header.dimensions, expected.dimensions || undefined );
  test.deepEqual( header.attributes, expected.attributes || undefined );
  test.deepEqual( header.variables, expected.variables || undefined );
  test.end()
};

var check_data = function ( test, data, expected ) {
  expected = expected || { data : [] };
  test.plan( 1 );
  test.deepEquals( unpack( data.variables[0].data.hi( 3 ).lo( 0 ) ), expected.data );
  test.end();
};

//console.log( path.dirname() )

var tests = [
  {
    input : "./data/testrh.nc",
    model : function () {
      return function ( header ) {
        tape( 'simple header parsing test one dimensions one variable', function ( test ) {
          check_header( test, header, {
            dimensions : [
              { name : 'dim1', size : 10000 }
            ],
            variables  : [
              {
                attributes : undefined,
                dimensions : [
                  { name : 'dim1', size : 10000 }
                ],
                name       : 'var1',
                offset     : 80,
                size       : 40000,
                type       : 5
              }
            ]
          } );
        } );
      }
    },
    data  : function () {
      return function ( data ) {
        tape( 'simple data parsing test no data', function ( test ) {
          check_data( test, data, {data : [ 420, 197, 391.5 ] } );
        } );
      };
    }
  },
  {
    input : "./data/testrh.nc",
    model : function () {
      return function ( header ) {
        tape( 'simple header parsing test one dimensions one variable', function ( test ) {
          check_header( test, header, {
            dimensions : [
              { name : 'dim1', size : 10000 }
            ],
            variables  : [
              {
                attributes : undefined,
                dimensions : [
                  { name : 'dim1', size : 10000 }
                ],
                name       : 'var1',
                offset     : 80,
                size       : 40000,
                type       : 5
              }
            ]
          } );
        } );
      }
    },
    data  : function () {
      return function ( data ) {
        tape( 'simple data parsing test no data', function ( test ) {
          check_data( test, data, {data : [ 420, 197, 391.5 ] } );
        } );
      };
    }
  }
];

for ( var i = 1; i < tests.length; i++ ) {
  var parser = new NetCDFParser( { debug : true, treat : function ( idx ) {
    return idx;
  } } );

  parser.on( "model", tests[i].model() );
  parser.on( "data", tests[i].data() );

  fs.createReadStream( tests[i].input ).pipe( parser );
}
