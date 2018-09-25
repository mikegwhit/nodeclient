# Helpers

Miscellaneous classes that don't belong in a particular package.  

## Guide: Integrating shutdown sequence with your system

Shutting down the Node.js process can be complex.  Files need to be written.  
Requests need to be properly fulfilled.  Traffic needs to be redirected.  
Cross-platform process handling differs.  These are a few reasons for 
implementing a shutdown class.  

If your system needs to implement functionality prior to shutdown, it's 
recommended for you to utilize the Shutdown.require(promise: Promise) function.
When your promise resolves or rejects, shutdown can proceed as usual.

<br>
<br>
<br> 
<img src="../../../media/logo.png" width="250"/>