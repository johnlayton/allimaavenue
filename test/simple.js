var tape = require( 'tape' );

var NetCDFParser = require( '../lib/allimaavenue.parser.js' );

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
  test.deepEqual( data, expected );
  test.end()
};

var tests = [
  {
    input : "4344    4601    0000    0000    0000    0000    0000    0000" +
            "0000    0000    0000    0000    0000    0000    0000    0000",
    model : function () {
      return function ( header ) {
        tape( 'simple header parsing test no dimensions', function ( test ) {
          check_header( test, header )
        } );
      };
    },
    data  : function () {
      return function ( data ) {
        tape( 'simple data parsing test no data', function ( test ) {
          check_data( test, data );
        } );
      };
    }
  },
  {
    input : "4344    4601    0000    0000    0000    000a    0000    0001" +
            "0000    0003    6469    6d00    0000    0005    0000    0000" +
            "0000    0000    0000    000b    0000    0001    0000    0002" +
            "7678    0000    0000    0001    0000    0000    0000    0000" +
            "0000    0000    0000    0003    0000    000c    0000    0050" +
            "0003    0001    0004    0001    0005    8001",
    model : function () {
      return function ( header ) {
        tape( 'simple header parsing test one dimension one variable', function ( test ) {
          check_header( test, header, {
            dimensions : [
              { name : 'dim', size : 5 }
            ],
            variables  : [
              { name : 'vx', offset : 80, size : 12, type : 3, attributes : undefined, dimensions : [
                { name : 'dim', size : 5 }
              ] }
            ]
          } )
        } );
      };
    },
    data  : function () {
      return function ( data ) {
        tape( 'simple data parsing test no data', function ( test ) {
          check_data( test, data, {
            variables : [
              { data     : {
                _shape0  : 5,
                _stride0 : 1,
                data     : { 0 : 3, 1 : 1, 2 : 4, 3 : 1, 4 : 5 },
                offset   : 0
              },
                shape    : [ 5 ],
                type     : 3,
                variable : {
                  attributes : undefined,
                  dimensions : [
                    { name : 'dim', size : 5 }
                  ],
                  name       : 'vx',
                  offset     : 80,
                  size       : 12,
                  type       : 3
                }
              }
            ]
          } );
        } );
      };
    }
  }
  ,
  {
    input : "4344    4601    0000    0000    0000    000a    0000    0001" +
            "0000    0003    6469    6d00    0000    0005    0000    0000" +
            "0000    0000    0000    000b    0000    0002    0000    0002" +
            "7678    0000    0000    0001    0000    0000    0000    0000" +
            "0000    0000    0000    0003    0000    000c    0000    0074" +
            "0000    0002    7778    0000    0000    0001    0000    0000" +
            "0000    0000    0000    0000    0000    0004    0000    000c" +
            "0000    0080    0003    0001    0004    0001    0005    8001" +
            "0000    00FA    0000    01FF    0000    F0FF    0000    00FF" +
            "0000    00FF",
    model : function () {
      return function ( header ) {
        tape( 'simple header parsing test one dimension two variables', function ( test ) {
          check_header( test, header, {
            dimensions : [
              { name : 'dim', size : 5 }
            ],
            variables  : [
              { name : 'vx', offset : 116, size : 12, type : 3, attributes : undefined, dimensions : [
                { name : 'dim', size : 5 }
              ] },
              { name : 'wx', offset : 128, size : 12, type : 4, attributes : undefined, dimensions : [
                { name : 'dim', size : 5 }
              ] }
            ]
          } )
        } );
      };
    },
    data  : function () {
      return function ( data ) {
        tape( 'simple data parsing test no data', function ( test ) {
          check_data( test, data, {
            variables : [
              { data     : {
                _shape0  : 5,
                _stride0 : 1,
                data     : { 0 : 3, 1 : 1, 2 : 4, 3 : 1, 4 : 5 },
                offset   : 0
              },
                shape    : [ 5 ],
                type     : 3,
                variable : {
                  attributes : undefined,
                  dimensions : [
                    { name : 'dim', size : 5 }
                  ],
                  name       : 'vx',
                  offset     : 116,
                  size       : 12,
                  type       : 3
                }
              },
              { data     : {
                _shape0  : 5,
                _stride0 : 1,
                data     : {  0: 250, 1: 511, 2: 61695, 3: 255, 4: 255 },
                offset   : 0
              },
                shape    : [ 5 ],
                type     : 4,
                variable : {
                  attributes : undefined,
                  dimensions : [
                    { name : 'dim', size : 5 }
                  ],
                  name       : 'wx',
                  offset     : 128,
                  size       : 12,
                  type       : 4
                }
              }
            ]
          } );
        } );
      };
    }
  }
];


for ( var i = 1; i < tests.length; i++ ) {

  var buffer = new Buffer( tests[i].input.replace( / /g, '' ), 'hex' );

  var parser = new NetCDFParser( { debug : true, treat : function ( i ) { return i; } } );

  parser.on( "model", tests[i].model() );
  parser.on( "data", tests[i].data() );

  parser.parse( buffer, 'binary', function () {
    //test.end()
  } );

}
