"use strict";

//implement nsIWebProgressListener (https://developer.mozilla.org/en/nsIWebProgressListener)
upassword.tabWatcher =
{
  QueryInterface: function(aIID){
    if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
      aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
      aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStateChange: function(aWebProgress, aRequest, aFlag, aStatus){
  },

  onLocationChange: function(aProgress, aRequest, aURI){
    var logger = upassword.getLogger('upassword.tabWatcher.onLocationChange');
    logger.info(aURI.asciiHost);
    upassword.Observers.notify("upassword.overlay.doLocationChange", aURI);
    return 0;
  },

  onProgressChange: function() {return 0;},
  onStatusChange: function() {return 0;},
  onSecurityChange: function() {return 0;},
  onLinkIconAvailable: function() {return 0;}
}

window.addEventListener("load", function(){
  gBrowser.addProgressListener(upassword.tabWatcher);
}, false);

window.addEventListener("unload", function(){
  gBrowser.removeProgressListener(upassword.tabWatcher);
}, false);