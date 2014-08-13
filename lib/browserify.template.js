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

  // Code goes here ...

  /*
   return function () {
   console.log( " Template Function Called ... " );
   console.log( arguments.join( ", " ) );
   }
   */

} ));