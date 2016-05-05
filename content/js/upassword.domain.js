"use strict";

var upassword = upassword || {};
upassword.domain = {
  getDomain : function(hostName){
    var tld = [], domain = '';
    var hostTokens = hostName.split('.').reverse();
    var gtld = hostTokens.shift();
    
    var tldDepth = upassword.domain.arrDepth(hostTokens, upassword.tlds[gtld], 1);
    
    hostTokens = hostName.split('.');
    var htIdx = hostTokens.length;
    
    while (htIdx--) {            
      var idxVal = hostTokens[htIdx];
      if (tldDepth > 0) {
        tld.unshift(idxVal);
      } else if (domain == '') {
          domain = idxVal;
      }
      --tldDepth;
    }
    return domain;
  },
  
  arrDepth: function(tokens, ptr, idx) {
    if (tokens.length != 0) {
     var token = tokens.shift();
     
     if (undefined != ptr[token]) {
         ++idx;
         if (ptr[token].length > 0) {
             ptr = ptr[token];
             idx = upassword.domain.arrDepth(tokens, ptr, idx);
         }
     
     } else if (undefined != ptr['*'] && undefined == ptr['!' + token]) {
         ++idx;
     }
    }
    
    return idx;
  }
}