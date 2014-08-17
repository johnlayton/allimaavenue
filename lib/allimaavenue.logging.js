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

  var stream  = require( 'stream' );
  var util    = require( 'util' );
  var decoder = require( 'string_decoder' );

  var StringDecoder = decoder.StringDecoder;
/*
  util.inherits( LoggingStream, stream.PassThrough );
  util.inherits( LoggingStream, stream.Duplex );
*/
  util.inherits( LoggingStream, stream.Transform );

  function LoggingStream( options ) {
    if ( !(this instanceof LoggingStream) ) {
      return new LoggingStream( options );
    }

    stream.Transform.call( this );

    this._writableState.objectMode = false;
    this._readableState.objectMode = true;
    //this._buffer = '';
    this._decoder = new StringDecoder('utf8');
  }

  LoggingStream.prototype._transform = function(chunk, encoding, cb) {
    //console.log( chunk.toString() )

    //var data = JSON.parse( chunk.toString() );

    console.log( ">>>" + util.inspect( this._writableState ) );
    console.log( ">>>" + util.inspect( this._readableState ) );

    //console.log( data )
    //this.push( data );
    cb();
  };

/*
  LoggingStream.prototype._read = function(size) {
    console.log( "Read [" + size + "]" );
  }

  LoggingStream.prototype._write = function(chunk, encoding, callback) {
    console.log( "Write [" + chunk + "]" );
    console.log( "encoding [" + encoding + "]" );

    callback();
  }
*/

/*
  LoggingStream.prototype.read = function ( size ) {
    var data = stream.PassThrough.prototype.read.call( this, size );
    console.log( "Read More Data [" + data + "]" );
    return  data;
  };

  LoggingStream.prototype.write = function ( data ) {
    console.log( "Write More Data [" + data + "]" );
    return stream.PassThrough.prototype.write.call( this, data );
  };
*/

  return LoggingStream;

} ));