var tape = require( 'tape' );
var fs = require( 'fs' );
var unpack = require( 'ndarray-unpack' );

var NetCDFParser = require( '../allimaavenue.js' );

var check_header = function ( test, header, expected ) {
  expected = expected || {};
  test.plan( 2 + ( expected.dimensions ? 1 : 0 ) + ( expected.attributes ? 1 : 0 ) + ( expected.variables ? 1 : 0 ));
  test.equal( header.title, expected.title || "CDF" );
  test.equal( header.version, expected.version || 1 );
  if ( expected.dimensions ) {
    test.deepEqual( header.dimensions, expected.dimensions );
  }
  if ( expected.attributes ) {
    test.deepEqual( header.attributes, expected.attributes );
  }
  if ( expected.variables ) {
    test.deepEqual( header.variables, expected.variables );
  }
  test.end()
};

var check_data = function ( test, data, expected ) {
  expected = expected || { data : [] };
  test.plan( 1 );
  test.deepEquals( unpack( data.variables[0].data.hi( 3 ).lo( 0 ) ), expected.data );
  test.end();
};

var tests = [
  {
    input : "./data/test_1.nc",
    model : function () {
      return function ( header ) {
        tape( 'simple header parsing test one dimensions one variable', function ( test ) {
          check_header( test, header, {
            dimensions : [ { name: 'Dr', size: 0 }, { name: 'D1', size: 1 }, { name: 'D2', size: 2 }, { name: 'D3', size: 3 }, { name: 'D4', size: 4 } ]
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
    input : "./data/test_2.nc",
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
        //tape( 'simple data parsing test no data', function ( test ) {
        //  check_data( test, data, {data : [ 420, 197, 391.5 ] } );
        //} );
      };
    }
  }
];

for ( var i = 0; i < tests.length; i++ ) {
  var parser = new NetCDFParser( { debug : true, treat : function ( idx ) {
    return idx;
  } } );

  parser.on( "model", tests[i].model() );
  //parser.on( "data", tests[i].data() );

  fs.createReadStream( tests[i].input ).pipe( parser );
}
