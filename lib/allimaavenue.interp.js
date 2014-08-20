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

  return function ( nd, idx ) {
    var body = "return nd" +
               ".hi( " + idx.map( function( i ) { return i[1] + 1; } ).join( ',' ) + " )" +
               ".lo( " + idx.map( function( i ) { return i[0]; } ).join( ',' ) + " )" +
               ";";
    var func = new Function("nd", "idx", body);
    return func( nd, idx );
  }

} ));