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

  return function ( ndarray, value ) {
    var arr = ndarray.data;
    for ( i = 0; i < arr.length - 1; i++ ) {
      if ( ( arr[i] >= value ) != ( arr[i+1] >= value ) ) {
        return [ i, i + 1 ];
      }
    }
    return [];
  }

} ));