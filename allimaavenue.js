(function ( root, factory ) {
  if ( typeof exports === 'object' ) {
    module.exports = factory();
  }
  else if ( typeof define === 'function' && define.amd ) {
    define( [], factory );
  }
  else {
    root.returnExports = factory();
  }
}( this, function () {

  var NetCDFParser = (function () {

    var util = require( 'util' );
    var ndarray = require( 'ndarray' );
    var stream = require( 'stream' );

    const TRACE = 0x01;
    const DEBUG = 0x02;
    const INFO = 0x03;

    LEVEL = {
      TRACE : TRACE,
      DEBUG : DEBUG,
      INFO  : INFO
    };

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
    const NC_STRING = 0xFF;

    TYPE = {
      NC_BYTE   : NC_BYTE,
      NC_CHAR   : NC_CHAR,
      NC_SHORT  : NC_SHORT,
      NC_INT    : NC_INT,
      NC_FLOAT  : NC_FLOAT,
      NC_DOUBLE : NC_DOUBLE,
      NC_STRING : NC_DOUBLE
    };

    // const NC_DIMENSION = '\x00\x00\x00\x0A'         // tag for list of dimensions
    // const NC_VARIABLE  = '\x00\x00\x00\x0B'         // tag for list of variables
    // const NC_ATTRIBUTE = '\x00\x00\x00\x0C'         // tag for list of attributes

    const NC_DIMENSION = 0X0A;
    const NC_VARIABLE = 0X0B;
    const NC_ATTRIBUTE = 0X0C;
    const NC_EMPTY = 0X00;

    COUNT = {
      NC_DIMENSION : NC_DIMENSION,
      NC_VARIABLE  : NC_VARIABLE,
      NC_ATTRIBUTE : NC_ATTRIBUTE
    };

    STATE = {
      BEGIN           : 0x00,
      HEADER          : 0x01,
      TITLE           : 0x02,
      VERSION         : 0x03,
      RECORDS         : 0x04,
      DEFINITION      : 0x05,
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
      VAR_DIM         : 0x17,
      VAR_ATTRS       : 0x18,
      VAR_ATTR        : 0x19,
      VAR_ATTR_LENGTH : 0x1A,
      VAR_ATTR_NAME   : 0x1B,
      VAR_ATTR_TYPE   : 0x1C,
      VAR_ATTR_COUNT  : 0x1D,
      VAR_ATTR_VALUE  : 0x1E,
      VAR_TYPE        : 0x1F,
      VAR_SIZE        : 0x20,
      VAR_BEGIN       : 0x21,
      DATA            : 0x22,
      DATA_VARS       : 0x23,
      DATA_VAR        : 0x24,
      DATA_VAR_READ   : 0x25,
      DATA_VAR_PARSE  : 0x26,
      DATA_READ       : 0x27,
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

    for ( var t in TYPE ) {
      TYPE[TYPE[t]] = t;
    }

    T = TYPE;

    for ( var t in LEVEL ) {
      LEVEL[LEVEL[t]] = t;
    }

    L = LEVEL;

    util.inherits( NetCDFParser, stream.Transform );

    function NetCDFParser( options ) {
      if ( !(this instanceof NetCDFParser) ) {
        return new NetCDFParser( options );
      }

      var parser = this;

      parser.options = options || {
        debug : false,
        trace : false,
        treat : function ( val ) {
          return val;
        }
      };

      parser.state = S.BEGIN;
      parser.buffer = new Buffer( 0 );
      parser.length = 4;
      parser.index = 0;
      parser.model = {
        head : {},
        data : {}
      };
      //parser.head = {};
      //parser.data = {};
      parser.temp = {};

      stream.Transform.call( this, options );

      this._writableState.objectMode = false;
      this._readableState.objectMode = false;
    }

    NetCDFParser.prototype.next = function ( state ) {
      this.state = state;
    };

    NetCDFParser.prototype.cache = function ( data ) {
      this.buffer = Buffer.concat( [this.buffer, data] )
    };

    NetCDFParser.prototype.slice = function ( count ) {
      var result = this.buffer.slice( this.index, this.index + count );
      //if ( this.buffer.length >= count ) {
      //  this.buffer = this.buffer.slice( count );
      //}
      parser.trace( "Slice [%s]", result.toString( 'hex' ) );

      this.index = this.index + count;
      return result;
    };

    NetCDFParser.prototype.peakInt32 = function () {
      //parser.trace( "Index [%d]", this.index );
      //parser.trace( "Buffer [%s]", this.buffer.toString( 'hex' ) );
      //parser.trace( "Slice [%s]", this.buffer.slice( this.index, this.index + 4 ).toString( 'hex' ) );
      //if ( this.buffer.length > this.index + 4 ) {
      return this.buffer.slice( this.index, this.index + 4 ).readInt32BE( 0 );
      //} else {
      //  return
      //}
    };

    NetCDFParser.prototype.remaining = function ( size ) {
      return ( size % 4 > 0 ) ? 4 - ( size % 4 ) : 0;
    };

    NetCDFParser.prototype.pad = function ( size, fill ) {
      return ( fill && size % 4 > 0 ) ? size + ( 4 - ( size % 4 ) ) : size;
    };

    NetCDFParser.prototype.readByte = function () {
      return this.slice( 1 ).readInt8( 0 )
    };

    NetCDFParser.prototype.readInt8 = function () {
      //parser.trace( "Slice [%s]", this.slice( 1 ).toString() );
      return this.slice( 1 ).readInt8( 0 );
    };

    NetCDFParser.prototype.readChar = function () {
      return this.slice( 1 ).readInt8( 0 ).toString();
    };

    NetCDFParser.prototype.readString = function ( size, fill ) {
      //var pad = ( fill && size % 4 > 0 ) ? size + ( 4 - ( size % 4 ) ) : size;
      return this.slice( this.pad( size, fill ) ).slice( 0, size ).toString();
    };

    NetCDFParser.prototype.readShort = function () {
      return this.slice( 2 ).readInt16BE( 0 );
    };

    NetCDFParser.prototype.readInt16 = function () {
      return this.slice( 2 ).readInt16BE( 0 );
    };

    NetCDFParser.prototype.readInt = function () {
      return this.slice( 4 ).readInt32BE( 0 );
    };

    NetCDFParser.prototype.readInt32 = function () {
      return this.slice( 4 ).readInt32BE( 0 );
    };

    NetCDFParser.prototype.readFloat = function () {
      return this.slice( 4 ).readFloatBE( 0 )
    };

    NetCDFParser.prototype.readDouble = function () {
      return this.slice( 8 ).readDoubleBE( 0 )
    };

    NetCDFParser.prototype.step = function ( type ) {
      switch ( type ) {
        case NC_BYTE:
          return 1;
        case NC_SHORT:
        case NC_CHAR:
        case NC_STRING:
          return 2;
        case NC_INT:
        case NC_FLOAT:
          return 4;
        case NC_DOUBLE:
          return 8;
        default:
          break;
      }
    };

    NetCDFParser.prototype.take = function ( type ) {
      switch ( type ) {
        case NC_BYTE:
          return function ( i ) {
            return parser.options.treat( parser.readByte() );
          };
        case NC_SHORT:
        case NC_CHAR:
          return function ( i ) {
            return parser.options.treat( parser.readInt16() );
          };
        case NC_INT:
          return function ( i ) {
            return parser.options.treat( parser.readInt32() );
          };
        case NC_FLOAT:
          return function ( i ) {
            return parser.options.treat( parser.readFloat() );
          };
        case NC_DOUBLE:
          return function ( i ) {
            return parser.options.treat( parser.readDouble() );
          };
        default:
          break;
      }
    };

    NetCDFParser.prototype.array = function ( type, count ) {
      var read = this.take( type );
      switch ( type ) {
        case NC_BYTE:
          arr = new Int8Array( count );
          for ( i = 0; i < count; i++ ) {
            arr[i] = read( i );
          }
          for ( i = 0; i < this.remaining( count * this.step( type ) ); i++ ) {
            parser.readByte();
          }
          return arr;
        case NC_CHAR:
          return parser.readString( count, true );
          break;
        case NC_SHORT:
          arr = new Int16Array( count );
          for ( i = 0; i < count; i++ ) {
            arr[i] = read( i );
          }
          for ( i = 0; i < this.remaining( count * this.step( type ) ); i++ ) {
            parser.readByte();
          }
          return arr;
        case NC_INT:
          arr = new Int32Array( count );
          buf = this.slice( count * this.step( type ) );
          for ( i = 0; i < count; i++ ) {
            arr[i] = buf.readInt32BE( i * 4 );
          }
          return arr;
        case NC_FLOAT:
          arr = new Float32Array( count );
          buf = this.slice( count * this.step( type ) );
          for ( i = 0; i < count; i++ ) {
            arr[i] = buf.readFloatBE( i * 4 );
          }
          return arr;
        case NC_DOUBLE:
          arr = new Float64Array( count );
          buf = this.slice( count * this.step( type ) );
          for ( i = 0; i < count; i++ ) {
            arr[i] = buf.readDoubleBE( i * 8 );
          }
          //for ( i = 0; i < count; i++ ) {
          //  arr[i] = read( i );
          //}
          return arr;
        default:
          break;
      }
    };

    NetCDFParser.prototype.debug = function ( msg, param ) {
      var p = function ( t ) {
        return (" ............... " + t ).slice( -18 );
      };
      if ( this.options.debug ) {
        console.log( "DEBUG %s %s - " + msg + "", p( new Date().toLocaleTimeString() ), p( S[this.state] ), param );
      }
    };

    NetCDFParser.prototype.trace = function ( msg, param ) {
      var p = function ( t ) {
        return ("  ............... " + t ).slice( -18 );
      };
      if ( this.options.trace ) {
        console.log( "TRACE %s %s - " + msg + "", p( new Date().toLocaleTimeString() ), p( S[this.state] ), param );
      }
    };

    NetCDFParser.prototype.parse = function ( chunk, encoding, callback ) {
      this._transform( chunk, encoding, callback );
    };

    NetCDFParser.prototype._transform = function ( chunk, encoding, callback ) {

      parser = this;
      parser.cache( chunk );

      proccessing = ( parser.buffer.length >= ( parser.index + parser.length ) );

      while ( proccessing ) {
        switch ( parser.state ) {
          case S.BEGIN:
            parser.temp = {};
            parser.debug( "----------", "" );
            parser.debug( "Begin [%s]", new Date() );
            parser.debug( "----------", "" );
            parser.next( S.HEADER );
            break;
          //--------//
          // Header //
          //--------//
          case S.HEADER:
            parser.next( S.TITLE );
            break;
          case S.TITLE:
            parser.model.head.title = parser.readString( 3 );
            parser.debug( "Title [%s]", parser.model.head.title );
            parser.next( S.VERSION );
            break;
          case S.VERSION:
            parser.model.head.version = parser.readInt8();
            parser.debug( "Version [%s]", parser.model.head.version );
            parser.next( S.RECORDS );
            break;
          case S.RECORDS:
            parser.model.head.records = parser.readInt32();
            parser.length = 8;
            parser.debug( "Records [%s]", parser.model.head.records );
            parser.next( S.DEFINITION );
            break;

          case S.DEFINITION:
            parser.temp = {};
            switch ( parser.peakInt32() ) {
              case NC_DIMENSION:
                parser.readInt32();
                parser.next( S.DIMENSIONS );
                break;
              case NC_ATTRIBUTE:
                parser.readInt32();
                parser.next( S.ATTRIBUTES );
                break;
              case NC_VARIABLE:
                parser.readInt32();
                parser.next( S.VARIABLES );
                break;
              case NC_EMPTY:
                parser.readInt32();
                if ( parser.buffer.length > 0 ) {
                  parser.next( S.DEFINITION );
                }
                else {
                  parser.emit( 'header', parser.model.head );
                  parser.emit( 'model', parser.model.head );
                  parser.next( S.FINISH );
                }
                break;
              default:
                if ( parser.buffer.length > 0 ) {
                  parser.emit( 'header', parser.model.head );
                  parser.emit( 'model', parser.model.head );
                  parser.next( S.DATA );
                }
                else {
                  parser.next( S.FINISH );
                }
                break;
            }
            parser.length = 4;
            break;
          //------------//
          // Dimensions //
          //------------//
          case S.DIMENSIONS:
            C[NC_DIMENSION] = parser.readInt32();
            parser.debug( "---------------", "" );
            parser.debug( "Dimensions [%s]", C[NC_DIMENSION] );
            parser.debug( "---------------", "" );
            if ( C[NC_DIMENSION] > 0 ) {
              parser.model.head.dimensions = [];
              parser.next( S.DIMENSION );
            }
            else {
              parser.next( S.DEFINITION );
            }
            break;
          case S.DIMENSION:
            parser.next( S.DIM_LENGTH );
            break;
          case S.DIM_LENGTH:
            parser.length = parser.readInt32();
            parser.debug( "Dimension name length [%s] ", parser.length );
            parser.next( S.DIM_NAME );
            break;
          case S.DIM_NAME:
            dimension = {
              name : parser.readString( parser.length, true ),
              size : parser.readInt32()
            };
            parser.debug( "Dimension name [%s] ", dimension.name );
            parser.debug( "Dimension size [%s] ", dimension.size );
            parser.model.head.dimensions.push( dimension );
            if ( parser.model.head.dimensions.length < C[NC_DIMENSION] ) {
              parser.next( S.DIMENSION );
            }
            else {
              parser.next( S.DEFINITION );
            }
            break;
          //------------//
          // Attributes //
          //------------//
          case S.ATTRIBUTES:
            C[NC_ATTRIBUTE] = parser.readInt32();
            parser.debug( "---------------", "" );
            parser.debug( "Attributes [%s]", C[NC_ATTRIBUTE] );
            parser.debug( "---------------", "" );
            parser.model.head.attributes = [];
            parser.next( S.ATTRIBUTE );
            break;
          case S.ATTRIBUTE:
            parser.temp = {};
            parser.next( S.ATTR_LENGTH );
            break;
          case S.ATTR_LENGTH:
            parser.length = parser.readInt32();
            parser.debug( "Attribute name length [%s] ", parser.length );
            parser.next( S.ATTR_NAME );
            break;
          case S.ATTR_NAME:
            parser.temp.name = parser.readString( parser.length, true );
            parser.debug( "Attribute name [%s] ", parser.temp.name );
            parser.next( S.ATTR_TYPE );
            break;
          case S.ATTR_TYPE:
            parser.temp.type = parser.readInt32();
            parser.debug( "Attribute type [%s]", T[parser.temp.type] );
            parser.next( S.ATTR_COUNT );
            break;
          case S.ATTR_COUNT:
            parser.temp.count = parser.readInt32();
            parser.length = 4 * parser.temp.count;
            parser.debug( "Attribute count [%s]", parser.count );
            parser.next( S.ATTR_VALUE );
            break;
          case S.ATTR_VALUE:
            attribute = {
              name  : parser.temp.name,
              type  : parser.temp.type,
              value : parser.array( parser.temp.type, parser.temp.count )
            };
            parser.debug( "Attribute value [%s]", util.inspect( attribute.value ) );
            parser.model.head.attributes.push( attribute );
            if ( parser.model.head.attributes.length < C[NC_ATTRIBUTE] ) {
              parser.next( S.ATTRIBUTE );
            }
            else {
              parser.next( S.DEFINITION );
            }
            break;
          //------------//
          // Variables  //
          //------------//
          case S.VARIABLES:
            C[NC_VARIABLE] = parser.readInt32();
            parser.debug( "--------------", "" );
            parser.debug( "Variables [%s]", C[NC_VARIABLE] );
            parser.debug( "--------------", "" );
            if ( C[NC_VARIABLE] > 0 ) {
              parser.model.head.variables = [];
              parser.next( S.VARIABLE );
            }
            else {
              parser.next( S.DEFINITION );
            }
            break;
          case S.VARIABLE:
            parser.temp = {};
            parser.next( S.VAR_LENGTH );
            break;
          case S.VAR_LENGTH:
            parser.length = parser.readInt32();
            parser.debug( "Variable name length [%s] ", parser.length );
            parser.next( S.VAR_NAME );
            break;
          case S.VAR_NAME:
            parser.temp.name = parser.readString( parser.length, true );
            parser.debug( "Variable name [%s] ", parser.temp.name );
            parser.next( S.VAR_DIMS );
            break;
          //---------------------//
          // Variable Dimensions //
          //---------------------//
          case S.VAR_DIMS:
            parser.temp.dimensions = [];
            C[NC_DIMENSION] = parser.readInt32();
            parser.debug( "------------------------", "" );
            parser.debug( "Variable dimensions [%s]", C[NC_DIMENSION] );
            parser.debug( "------------------------", "" );
            if ( C[NC_DIMENSION] > 0 ) {
              parser.length = 4 * C[NC_DIMENSION];
              parser.next( S.VAR_DIM );
            }
            else {
              parser.length = 4;
              parser.next( S.VAR_ATTRS );
            }
            break;
          case S.VAR_DIM:
            parser.temp.dimensions.push( parser.model.head.dimensions[parser.readInt32()] );
            parser.debug( "Variable dimensions [%s] ", util.inspect( parser.temp.dimensions, true, 5 ) );
            if ( parser.temp.dimensions.length < C[NC_DIMENSION] ) {
              parser.next( S.VAR_DIM );
            }
            else {
              parser.next( S.VAR_ATTRS );
            }
            break;
          //---------------------//
          // Variable Attributes //
          //---------------------//
          case S.VAR_ATTRS:
            if ( NC_ATTRIBUTE == parser.peakInt32() ) {
              parser.readInt32();
              C[NC_ATTRIBUTE] = parser.readInt32();
              parser.temp.attributes = [];
              parser.debug( "------------------------", "" );
              parser.debug( "Variable attributes [%s]", C[NC_ATTRIBUTE] );
              parser.debug( "------------------------", "" );
              parser.next( S.VAR_ATTR );
            }
            else if ( NC_EMPTY == parser.peakInt32() ) {
              parser.readInt32();
              parser.next( S.VAR_ATTRS );
            }
            else {
              parser.next( S.VAR_TYPE );
            }
            break;
          case S.VAR_ATTR:
            parser.temp.attribute = {};
            parser.next( S.VAR_ATTR_LENGTH );
            break;
          case S.VAR_ATTR_LENGTH:
            parser.temp.attribute.length = parser.readInt32();
            parser.debug( "Variable attribute name length [%s] ", parser.temp.attribute.length );
            parser.next( S.VAR_ATTR_NAME );
            break;
          case S.VAR_ATTR_NAME:
            parser.temp.attribute.name = parser.readString( parser.temp.attribute.length, true );
            parser.debug( "Variable attribute name [%s] ", parser.temp.attribute.name );
            parser.next( S.VAR_ATTR_TYPE );
            break;
          case S.VAR_ATTR_TYPE:
            parser.temp.attribute.type = parser.readInt32();
            parser.debug( "Variable attribute type [%s] ", T[parser.temp.attribute.type] );
            parser.next( S.VAR_ATTR_COUNT );
            break;
          case S.VAR_ATTR_COUNT:
            parser.temp.attribute.count = parser.readInt32();
            parser.length = 4 * parser.temp.attribute.count;
            parser.debug( "Variable attribute count [%s] ", parser.temp.attribute.count );
            parser.next( S.VAR_ATTR_VALUE );
            break;
          case S.VAR_ATTR_VALUE:
            parser.temp.attribute.value = parser.array( parser.temp.attribute.type,
                                                        parser.temp.attribute.count )
            parser.debug( "Variable attribute value [%s] ", parser.temp.attribute.value );
            attribute = {
              name  : parser.temp.attribute.name,
              type  : parser.temp.attribute.type,
              value : parser.temp.attribute.value
            };
            parser.temp.attributes.push( attribute );
            parser.length = 4;
            if ( parser.temp.attributes.length < C[NC_ATTRIBUTE] ) {
              parser.next( S.VAR_ATTR );
            }
            else {
              parser.next( S.VAR_TYPE );
            }
            break;
          case S.VAR_TYPE:
            parser.temp.type = parser.readInt32();
            parser.debug( "Variable type [%s] ", T[parser.temp.type] );
            parser.next( S.VAR_SIZE );
            break;
          case S.VAR_SIZE:
            parser.temp.size = parser.readInt32();
            parser.debug( "Variable size [%s] ", parser.temp.size );
            parser.next( S.VAR_BEGIN );
            break;
          case S.VAR_BEGIN:
            parser.temp.offset = parser.readInt32();
            parser.debug( "Variable offset [%s] ", parser.temp.offset );
            variable = {
              name       : parser.temp.name,
              type       : parser.temp.type,
              size       : parser.temp.size,
              offset     : parser.temp.offset,
              dimensions : parser.temp.dimensions,
              attributes : parser.temp.attributes
            };
            parser.debug( "Variable [%s] ", util.inspect( variable, true, 5 ) );
            parser.model.head.variables.push( variable );
            if ( parser.model.head.variables.length < C[NC_VARIABLE] ) {
              parser.next( S.VARIABLE );
            }
            else {
              parser.next( S.DEFINITION );
            }
            break;
          //------//
          // Data //
          //------//
          case S.DATA:
            parser.debug( "---------", "" );
            parser.debug( "Read Data", "" );
            parser.debug( "---------", "" );
            parser.next( S.DATA_VARS );
            break;
          case S.DATA_VARS:
            parser.temp = {};
            parser.model.data.variables = [];
            parser.next( S.DATA_VAR );
            break;
          case S.DATA_VAR:
            parser.temp.variable = parser.model.head.variables[parser.model.data.variables.length];
            parser.temp.shape = [];
            parser.temp.type = parser.temp.variable.type;
            parser.count = 1;
            parser.length = parser.step( parser.temp.type );
            // TODO: Do I need to consume all data for stream and cache??
            for ( var j = 0; j < parser.temp.variable.dimensions.length; j++ ) {
              var size = parser.temp.variable.dimensions[j].size;
              parser.temp.shape.push( size );
              parser.count = parser.count * size;
              parser.length = parser.length * size;
            }
            parser.length = parser.pad( parser.length, true );
            parser.debug( "Data shape [%s]", util.inspect( parser.temp.shape ) );
            parser.debug( "Data count [%d]", parser.count );
            parser.debug( "Data type [%d]", parser.temp.type );
            parser.debug( "Data length [%d]", parser.length );
            parser.debug( "----------------------------", "" );
            parser.debug( "Start Reading [" + parser.temp.variable.name + "] Remaining [" + ( parser.index + parser.length - parser.buffer.length ) + "] at [%s]", new Date() );
            parser.next( S.DATA_VAR_READ );
            break;
          case S.DATA_VAR_READ:
            if ( parser.buffer.length >= ( parser.index + parser.length ) ) {
              parser.debug( "Finish Reading at [%s]", new Date() );
              parser.debug( "----------------------------", "" );
              parser.next( S.DATA_VAR_PARSE );
            }
            else {
              parser.debug( "Remaining [%d]", ( parser.index + parser.length - parser.buffer.length ) );
              parser.next( S.DATA_VAR_READ );
            }
            break;
          case S.DATA_VAR_PARSE:
            parser.debug( "----------------------------", "" );
            parser.debug( "Start Parsing [" + parser.temp.variable.name + "] at [%s]", new Date() );
            data = ndarray( parser.array( parser.temp.type, parser.count ), parser.temp.shape );
            parser.debug( "Finish Parsing at [%s]", new Date() );
            parser.debug( "----------------------------", "" );
            parser.debug( "Data values [%s]", data.size );
            variable = {
              variable : parser.temp.variable,
              shape    : parser.temp.shape,
              type     : parser.temp.type,
              data     : data
            };
            parser.model.data.variables.push( variable );
            parser.emit( 'variable', variable );
            if ( parser.model.data.variables.length < parser.model.head.variables.length ) {
              parser.length = 4;
              parser.next( S.DATA_VAR );
            }
            else {
              parser.next( S.DATA_READ );
            }
            break;
          case S.DATA_READ:
            parser.emit( 'data', parser.model.data );
            parser.next( S.FINISH );
            break;
          case S.FINISH:
            parser.debug( "----------", "" );
            parser.debug( "Finish [%s]", new Date() );
            parser.debug( "Total [%s]", parser.buffer.length );
            parser.debug( "Length [%s]", parser.length );
            parser.debug( "Index [%s]", parser.index );
            parser.emit( 'end', parser.model );
            proccessing = false;
            break;
          default:
            break;
        }
        switch ( parser.state ) {
          case S.DATA_READ:
            proccessing = true;
            break;
          case S.FINISH:
            break;
          default:
            proccessing = proccessing && ( parser.buffer.length >= Math.max( 4, ( parser.index + parser.length ) ) );
            break;
        }
      }

      //parser.push( chunk );

      callback();

    };

    return NetCDFParser;
  })();

  return function ( options ) {
    return new NetCDFParser( options );
  };

} ));