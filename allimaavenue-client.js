var fs = require( 'fs' );
var util = require( 'util' );
var binary = require( 'binary' );
var through = require( 'through' );

// const NC_DIMENSION = '\x00\x00\x00\x0A'         // tag for list of dimensions
// const NC_VARIABLE  = '\x00\x00\x00\x0B'         // tag for list of variables
// const NC_ATTRIBUTE = '\x00\x00\x00\x0C'

const NC_DIMENSION = 0X0A;
const NC_VARIABLE = 0X0B;
const NC_ATTRIBUTE = 0X0C;

//NC_BYTE      = \x00 \x00 \x00 \x01       // 8-bit signed integers
//NC_CHAR      = \x00 \x00 \x00 \x02       // text characters
//NC_SHORT     = \x00 \x00 \x00 \x03       // 16-bit signed integers
//NC_INT       = \x00 \x00 \x00 \x04       // 32-bit signed integers
//NC_FLOAT     = \x00 \x00 \x00 \x05       // IEEE single precision floats
//NC_DOUBLE    = \x00 \x00 \x00 \x06       // IEEE double precision floats

const NC_BYTE = 0x01;
const NC_CHAR = 0x02;
const NC_SHORT = 0x03;
const NC_INT = 0x04;
const NC_FLOAT = 0x05;
const NC_DOUBLE = 0x06;

//var NetCDFParser = NetCDFParser;
//var NetCDFStream = NetCDFStream;

COUNT = {
  NC_DIMENSION : NC_DIMENSION,
  NC_VARIABLE  : NC_VARIABLE,
  NC_ATTRIBUTE : NC_ATTRIBUTE
};

STATE = {
  BEGIN           : 0x00,
  HEADER          : 0x01,
  TITLE           : 0x02,
  VERSION         : 0x04,
  RECORDS         : 0x05,
  DIMENSIONS      : 0x06,
  DIMENSION       : 0x07,
  DIM_LENGTH      : 0x08,
  DIM_NAME        : 0x09,
  DIM_SIZE        : 0x0A,
  ATTRIBUTES      : 0x0B,
  ATTRIBUTE       : 0x0C,
  ATTR_LENGTH     : 0x0D,
  ATTR_NAME       : 0x0E,
  ATTR_TYPE       : 0x0F,
  ATTR_COUNT      : 0x10,
  ATTR_VALUE      : 0x11,
  VARIABLES       : 0x12,
  VARIABLE        : 0x13,
  VAR_LENGTH      : 0x14,
  VAR_NAME        : 0x15,
  VAR_DIMS        : 0x16,
  VAR_ATTRS       : 0x17,
  VAR_ATTR        : 0x18,
  VAR_ATTR_LENGTH : 0x19,
  VAR_ATTR_NAME   : 0x1A,
  VAR_ATTR_TYPE   : 0x1B,
  VAR_ATTR_COUNT  : 0x1C,
  VAR_ATTR_VALUE  : 0x1D,
  VAR_TYPE        : 0x1E,
  VAR_SIZE        : 0x1F,
  VAR_BEGIN       : 0x20,
  DATA            : 0x21,
  DATA_VARS       : 0x22,
  DATA_VAR        : 0x23,
  DATA_VAR_READ   : 0x24,
  FINISH          : 0xFF
};

for ( var s in STATE ) {
  STATE[STATE[s]] = s;
}

S = STATE;

for ( var c in COUNT ) {
  COUNT[COUNT[c]] = 0;
}

C = COUNT;

//console.log( util.inspect( C ) );

function NetCDFParser( opt ) {
  if ( !(this instanceof NetCDFParser) ) {
    return new NetCDFParser( opt );
  }
  var parser = this;
  parser.stream = through(
    function write( data ) {
      this.queue( data )
    },
    function end() {
      this.queue( null )
    } );
  parser.state = S.BEGIN;
  parser.buffer = new Buffer( 0 );
  parser.length = 4;
  parser.model = {};
  parser.data = {};
  parser.temp = {};
}

NetCDFParser.prototype.parse = function ( stream ) {
  var parser = this;
  stream
    .on( 'data', this.reader( stream ) )
    .on( 'end', this.end() );
  return parser.stream;
};

NetCDFParser.prototype.cache = function ( data ) {
  this.buffer = Buffer.concat( [ this.buffer, data ] )
};

NetCDFParser.prototype.slice = function ( count ) {
  var take = this.buffer.slice( 0, count );
  var leave = this.buffer.slice( count );
  this.buffer = leave;
  return take;
};

NetCDFParser.prototype.readString = function ( size, fill ) {
  var pad = ( fill && size % 4 > 0 ) ? size + ( 4 - ( size % 4 ) ) : size;
  return this.slice( pad ).slice( 0, size ).toString();
};

NetCDFParser.prototype.readInt8 = function () {
  return this.slice( 1 ).readInt8( 0 );
};

NetCDFParser.prototype.readInt16 = function () {
  return this.slice( 2 ).readInt16BE( 0 );
};

NetCDFParser.prototype.readInt32 = function () {
  return this.slice( 4 ).readInt32BE( 0 );
};

NetCDFParser.prototype.readFloat = function () {
  return this.slice( 4 ).readFloatBE( 0 )
};

NetCDFParser.prototype.readByte = function () {
  return this.slice( 1 ).readInt8( 0 )
};

NetCDFParser.prototype.readDouble = function () {
  return this.slice( 8 ).readDoubleBE( 0 )
};

NetCDFParser.prototype.reader = function ( stream ) {

  var parser = this;

  return function ( data ) {
    parser.cache( data );

    if ( parser.buffer.length > parser.length ) {
      stream.pause();
    }

    proccessing = parser.buffer.length > parser.length;
    while ( proccessing ) {
      switch ( parser.state ) {
        case S.BEGIN:
          parser.temp = {};
          parser.state = S.HEADER;
          break;
        case S.HEADER:
          parser.state = S.TITLE;
          break;
        case S.TITLE:
          parser.model.title = parser.readString( 3 );
          parser.state = S.VERSION;
          break;
        case S.VERSION:
          parser.model.version = parser.readInt8();
          parser.state = S.RECORDS;
          break;
        case S.RECORDS:
          parser.model.records = parser.readInt32();
          parser.state = S.DIMENSIONS;
          break;

        case S.DIMENSIONS:
          parser.temp = {};
          if ( NC_DIMENSION == parser.readInt32() ) {
            C[NC_DIMENSION] = parser.readInt32();
            parser.model.dimensions = [];
            parser.state = S.DIMENSION;
          }
          break;
        case S.DIMENSION:
          parser.state = S.DIM_LENGTH;
          break;
        case S.DIM_LENGTH:
          parser.length = parser.readInt32();
          parser.state = S.DIM_NAME;
          break;
        case S.DIM_NAME:
          dimension = {
            name : parser.readString( parser.length, true ),
            size : parser.readInt32()
          };
          parser.model.dimensions.push( dimension );
          if ( parser.model.dimensions.length < C[NC_DIMENSION] ) {
            parser.state = S.DIMENSION;
          }
          else {
            parser.state = S.ATTRIBUTES;
          }
          break;

        case S.ATTRIBUTES:
          parser.temp = {};
          if ( NC_ATTRIBUTE == parser.readInt32() ) {
            C[NC_ATTRIBUTE] = parser.readInt32();
            parser.model.attributes = [];
            parser.state = S.ATTRIBUTE;
          }
          break;
        case S.ATTRIBUTE:
          parser.state = S.ATTR_LENGTH;
          break;
        case S.ATTR_LENGTH:
          parser.length = parser.readInt32();
          parser.state = S.ATTR_NAME;
          break;
        case S.ATTR_NAME:
          parser.name = parser.readString( parser.length, true );
          parser.state = S.ATTR_TYPE;
          break;
        case S.ATTR_TYPE:
          parser.type = parser.readInt32();
          parser.state = S.ATTR_COUNT;
          break;
        case S.ATTR_COUNT:
          parser.count = parser.readInt32();
          parser.state = S.ATTR_VALUE;
          break;
        case S.ATTR_VALUE:
          switch ( parser.type ) {
            case NC_BYTE:
              parser.value = parser.readByte();
              break;
            case NC_CHAR:
              parser.value = parser.readString( parser.count, true );
              break;
            case NC_INT:
              parser.value = parser.readInt32();
              break;
            case NC_FLOAT:
              parser.value = parser.readFloat();
              break;
            case NC_DOUBLE:
              parser.value = parser.readDouble();
              break;
            case NC_SHORT:
              parser.value = parser.readInt32();
              break;
            default:
              break;
          }
          attribute = {
            name  : parser.name,
            type  : parser.type,
            value : parser.value
          };
          parser.model.attributes.push( attribute );
          if ( parser.model.attributes.length < C[NC_ATTRIBUTE] ) {
            parser.state = S.ATTRIBUTE;
          }
          else {
            parser.state = S.VARIABLES;
          }
          break;

        case S.VARIABLES:
          parser.temp = {};
          if ( NC_VARIABLE == parser.readInt32() ) {
            C[NC_VARIABLE] = parser.readInt32();
            parser.model.variables = [];
            parser.state = S.VARIABLE;
          }
          break;
        case S.VARIABLE:
          parser.state = S.VAR_LENGTH;
          break;
        case S.VAR_LENGTH:
          parser.length = parser.readInt32();
          parser.state = S.VAR_NAME;
          break;
        case S.VAR_NAME:
          parser.name = parser.readString( parser.length, true );
          parser.state = S.VAR_DIMS;
          break;
        case S.VAR_DIMS:
          parser.temp.dimensions = [];
          var readInt32BE = parser.readInt32();
          for ( i = 0; i < readInt32BE; i++ ) {
            parser.temp.dimensions.push( parser.model.dimensions[ parser.readInt32() ] );
          }
          parser.state = S.VAR_ATTRS;
          break;
        case S.VAR_ATTRS:
          if ( NC_ATTRIBUTE == parser.readInt32() ) {
            C[NC_ATTRIBUTE] = parser.readInt32();
            parser.temp.attributes = [];
            parser.state = S.VAR_ATTR;
          }
          break;
        case S.VAR_ATTR:
          parser.state = S.VAR_ATTR_LENGTH;
          break;
        case S.VAR_ATTR_LENGTH:
          parser.temp.length = parser.readInt32();
          parser.state = S.VAR_ATTR_NAME;
          break;
        case S.VAR_ATTR_NAME:
          parser.temp.name = parser.readString( parser.temp.length, true );
          parser.state = S.VAR_ATTR_TYPE;
          break;
        case S.VAR_ATTR_TYPE:
          parser.temp.type = parser.readInt32();
          parser.state = S.VAR_ATTR_COUNT;
          break;
        case S.VAR_ATTR_COUNT:
          parser.temp.count = parser.readInt32();
          parser.state = S.VAR_ATTR_VALUE;
          break;
        case S.VAR_ATTR_VALUE:
          switch ( parser.temp.type ) {
            case NC_INT:
            case NC_SHORT:
            case NC_BYTE:
              parser.temp.value = parser.readInt32();
              break;
            case NC_CHAR:
              parser.temp.value = parser.readString( parser.temp.count, true );
              break;
            case NC_FLOAT:
              parser.temp.value = parser.readFloat();
              break;
            case NC_DOUBLE:
              parser.temp.value = parser.readDouble();
              break;
            default:
              break;
          }
          attribute = {
            name  : parser.temp.name,
            type  : parser.temp.type,
            value : parser.temp.value
          };
          parser.temp.attributes.push( attribute );
          if ( parser.temp.attributes.length < C[NC_ATTRIBUTE] ) {
            parser.state = S.VAR_ATTR;
          }
          else {
            parser.state = S.VAR_TYPE;
          }
          break;
        case S.VAR_TYPE:
          parser.temp.type = parser.readInt32();
          parser.state = S.VAR_SIZE;
          break;
        case S.VAR_SIZE:
          parser.temp.size = parser.readInt32();
          parser.state = S.VAR_BEGIN;
          break;
        case S.VAR_BEGIN:
          parser.temp.offset = parser.readInt32();
          variable = {
            name       : parser.name,
            type       : parser.temp.type,
            size       : parser.temp.size,
            offset     : parser.temp.offset,
            dimensions : parser.temp.dimensions,
            attributes : parser.temp.attributes
          };
          parser.model.variables.push( variable );
          if ( parser.model.variables.length < C[NC_VARIABLE] ) {
            parser.state = S.VARIABLE;
          }
          else {
            parser.state = S.DATA;
            console.log( util.inspect( parser.model, true, 5 ) )
            parser.stream.write( JSON.stringify( parser.model ) );
          }
          break;

        case S.DATA:
          parser.state = S.DATA_VARS;
          break;
        case S.DATA_VARS:
          parser.temp = {};
          parser.data.variables = [];
          parser.state = S.DATA_VAR;
          break;
        case S.DATA_VAR:
          model_variable = parser.model.variables[ parser.data.variables.length ];
          parser.temp.shape = [];
          parser.temp.type = model_variable.type;
          parser.length = 4;
          for ( var j = 0; j < model_variable.dimensions.length; j++ ) {
            var size = model_variable.dimensions[j].size;
            parser.temp.shape.push( size );
            parser.length = parser.length * size;
          }
          parser.state = S.DATA_VAR_READ;
          break;
        case S.DATA_VAR_READ:
          var nested = function ( arr, func ) {
            var idx = [];
            if ( arr.length ) {
              for ( var i = 0; i < arr.slice( 0, 1 ); i++ ) {
                idx[i] = nested( arr.slice( 1 ), func );
              }
            }
            else {
              idx = func()
            }
            return idx;
          };
          var peek = parser.temp.type == 5 ? function () {
            return parser.readFloat();
          } : function () {
            return parser.readInt32();
          };

          parser.data.variables.push( nested( parser.temp.shape, peek ) );

          if ( parser.data.variables.length < parser.model.variables.length ) {
            parser.length = 4;
            parser.state = S.DATA_VAR;
          }
          else {
            console.log( JSON.stringify( parser.data ) );
            parser.stream.write( "**" + JSON.stringify( parser.data ) + "**" );
            parser.state = S.FINISH;
          }
          break;
        case S.FINISH:
        default:
          proccessing = false;
          //parser.stream.end( );
          break;
      }

      proccessing = proccessing && ( parser.buffer.length > Math.max( 4, parser.length ) );
    }

    if ( parser.buffer.length < Math.max( 4, parser.length ) ) {
      stream.resume();
    }

  };
};

NetCDFParser.prototype.end = function () {
  return function () {
    console.log( '__INPUT END__' );
  }
};

parse = function ( stream, opt ) {
  return new NetCDFParser( opt | {} ).parse( stream );
};

var length = 1000;
//var files = [ 'IDV71000_VIC_T_SFC.nc',
//              'IDV71006_VIC_Wind_Mag_SFC.nc' ];
var files = [ 'IDV71000_VIC_T_SFC.nc' ];
for ( var i = 0; i < files.length; i++ ) {
  parse( fs.createReadStream( files[i], { /* start : 0, end   : ( length * 4 ) - 1  */} ), {} ).pipe( process.stdout );
}

