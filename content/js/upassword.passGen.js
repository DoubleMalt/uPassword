"use strict";
function passGen(){
  this.Type_Number = 0x01;
  this.Type_LowerCase = 0x02;
  this.Type_UpperCase = 0x04;
  this.Type_Letter = 0x06;
  this.Type_Normal = 0x07;
  this.Type_Special = 0x08;
  this.Type_All = 0x0F;
  
  this.NUMBERS = "0912873465";
  this.LOWERS = "abcdefghijklmnopqrstuvwxyz";
  this.UPPERS = "ZYXWVUTSRQPONMLKJIHGFEDCBA";
  this.SPECIALS = "!@#$%^&*()";
  
  this.m_strExpand = "";
  this.m_sha1hash = "";
  
  this.resetCounts();
}

passGen.prototype.sha1 = function(str, asByte) {
  var converter =
    Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
      createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

  converter.charset = "UTF-8";
  var result = {};
  var data = converter.convertToByteArray(str, result);
  var ch = Components.classes["@mozilla.org/security/hash;1"]
                     .createInstance(Components.interfaces.nsICryptoHash);
  ch.init(ch.SHA1);
  ch.update(data, data.length);
  var hash = ch.finish(false);

  if(asByte)
  {
    var result = [];
    for (var i in hash){
      result.push(hash.charCodeAt(i));
    }
    return result;
  }
  // return the two-digit hexadecimal code for a byte
  function toHexString(charCode)
  {
    return ("0" + charCode.toString(16)).slice(-2);
  }

  // convert the binary hash data to a hex string.
  var string_result = [];
  for (var i in hash){
    string_result.push(toHexString(hash.charCodeAt(i)));
  }

  var s = string_result.join("");

  return s;
}

passGen.prototype.resetCounts = function() {
  this.m_nNumCount = 0;
  this.m_nLowerCount = 0;
  this.m_nUpperCount = 0;
  this.m_nSpecCount = 0;
  this.m_hashVisitor = null;
  this.m_sbPass = '';
}

passGen.prototype.getHashFromString = function(psk){
  return this.sha1(psk);
}

passGen.prototype.prepareHashString = function(psk, displayName, upRevision){
  //displayName = this.convertStringToUTF8(displayName);
  
  var upasswordURI = 'unipass://' + psk + '@' + displayName;
  if(upRevision){
    upRevision = parseInt(upRevision);
    if(upRevision > 0)
      upasswordURI += '?revision=' + upRevision;
  }
    
  if(this.expand)
    upasswordURI += '?expand=' + this.expand;
  this.m_sha1hash = this.sha1(upasswordURI, true);
  return this.m_sha1hash;
}

passGen.prototype.getPasswordFromString = function(types, len) {
  this.resetCounts();
  if( this.m_sha1hash.length > 0) {
    this.m_hashVisitor = new hashVisitor(this.m_sha1hash, len);
    var i = 0, c;
    if( (types & this.Type_Letter) != 0 ) {
      c = this.getNextCharacter(types & this.Type_Letter);
      ++i;
      this.m_sbPass += c;
    }
    for(; i < len; ++i)
    {
      c = this.getNextCharacter(types);
      this.m_sbPass += c;
    }
    this.rulesCheck(types);
  }
  return this.m_sbPass;
}

passGen.prototype.getNextCharacter = function(types)
{                            
  var nums = 0, lower = 0, upper = 0, specs = 0, total, idx;
  var c;              
  if( (types & this.Type_Number) != 0) {
      nums = this.NUMBERS.length;
  }   
  if( (types & this.Type_LowerCase) != 0 ) {
      lower = this.LOWERS.length;
  }
  if( (types & this.Type_UpperCase) != 0 ) {
      upper = this.UPPERS.length;
  }
  if( (types & this.Type_Special) != 0 ) {
      specs = this.SPECIALS.length;
  }
  total = nums + lower + upper + specs;
  idx = this.m_hashVisitor.getNextIndex(total);
  if( nums > 0 ) {
      if( idx < nums ) {
          c = this.NUMBERS.charAt(idx);
          ++this.m_nNumCount;
      } else {
          idx -= nums;
      }
  }
  if( !c && lower > 0 ) {
      if( idx < lower ) {
          c = this.LOWERS.charAt(idx);
          ++this.m_nLowerCount;
      } else {
          idx -= lower;
      }
  }
  if( !c && specs > 0 ) {
      if( idx < specs ) {
          c = this.SPECIALS.charAt(idx);
          ++this.m_nSpecCount;
      } else {
          idx -= specs;
      }
  }
  if( !c && upper > 0 ) {
      if( idx < upper ) {
          c = this.UPPERS.charAt(idx);
          ++this.m_nUpperCount;
      } else {
          idx -= upper;
      }
  }
  if(!c ){
    c = '?';
    ++this.m_nSpecCount;
  }
  return c;
}

passGen.prototype.rulesCheck = function(types)
{
  var numMissing = false, lowerMissing= false, upperMissing = false, specMissing = false;
  if( (types & this.Type_Number) != 0 && this.m_nNumCount == 0 ) {
    numMissing = true;
  }   
  if( (types & this.Type_LowerCase) != 0 && this.m_nLowerCount == 0 ) {
    lowerMissing = true;
  }
  if( (types & this.Type_UpperCase) != 0 && this.m_nUpperCount == 0 ) {
    upperMissing = true;
  }
  if( (types & this.Type_Special) != 0 && this.m_nSpecCount == 0 ) {
    specMissing = true;
  }
  
  if( types == this.Type_Special ) return;
  if( !(numMissing || lowerMissing || upperMissing || specMissing) && this.m_nSpecCount < this.m_sbPass.length * 0.3) return;

  this.numsIndex = [];
  this.letterIndex = [];
  this.specsIndex = [];
  var firstLower = true, firstUpper = true;

  for( var i = 0; i < this.m_sbPass.length; ++i) {
    var c = this.m_sbPass.charAt(i);
    if( c >='0' && c <= '9' ) {
      this.numsIndex.push(i);
    } 
    else 
      if (c >= 'a' && c <= 'z') {
        if(firstLower) {
           firstLower = false;
        } else {
          this.letterIndex.push(i);    
        }
      } 
      else 
        if (c >= 'A' && c <= 'Z') {
          if(firstUpper) {
             firstUpper = false;
          } else {
            this.letterIndex.push(i);    
          }
        } else {
          this.specsIndex.push(i);
        }
  }

  if( this.numsIndex.length > 0 ) this.numsIndex.pop();
  if( this.specsIndex.length > 0 ) this.specsIndex.pop();

  if( this.m_nSpecCount >= this.m_sbPass.length * 0.3 ) {
    if( lowerMissing ) {
      this.insertMissingChars('specsIndex', null, this.LOWERS);
      lowerMissing = false;
      ++this.m_nLowerCount;
    } else if ( upperMissing ) {
      this.insertMissingChars('specsIndex', null, this.UPPERS);
      upperMissing = false;
      ++this.m_nUpperCount;
    } else {
      this.insertMissingChars('specsIndex', null, this.NUMBERS);
      numMissing = false;
      ++this.m_nNumCount;
    }
    --this.m_nSpecCount;
  }
  
  if( numMissing ) {
      this.insertMissingChars('letterIndex', 'specsIndex', this.NUMBERS);
  }
  if( specMissing ) {
      this.insertMissingChars('letterIndex', 'numsIndex', this.SPECIALS);
  }
  if( lowerMissing ) {
    if( this.letterIndex.length > 1  || (this.specsIndex.length == 0 && this.numsIndex.length == 0) ) {
        this.replaceSelected('letterIndex', null, 0, this.LOWERS);
    } else {
        this.insertMissingChars('specsIndex', 'numsIndex', this.LOWERS);
    }
  }
  if( upperMissing ) {
    if( this.letterIndex.length > 1  || (this.specsIndex.length == 0 && this.numsIndex.length == 0) ) {
      this.replaceSelected('letterIndex', null, 0, this.UPPERS);
    } else {
        this.insertMissingChars('specsIndex', 'numsIndex', this.UPPERS);
    }
  }
}

passGen.prototype.insertMissingChars = function(first, second, selections)
{

  var range = this[first].length, pos1, pos2;
  if(this[second]) {
    if( this[second].length >= range*0.5 ) {
      range = range + this[second].length;
    }
  }
  if( range == 0 ) {
    return;
  } else if( range < 6 ) {
    pos1 = this.m_hashVisitor.getNextIndex( range );
    pos2 = this.m_sbPass.length;
  } else {
    var sel = this.m_hashVisitor.getNextIndex( range * range );
    pos2 = sel % range;
    pos1 = (sel - pos2) / range;
  }
  this.replaceSelected( first, second, pos1, selections );
  if( pos2 < (range - 1) ) {
    this.replaceSelected( first, second, pos2, selections );
  }
}

passGen.prototype.replaceSelected = function(first, second, index, selections )
{
  if(this[second])
    if(index < this[first].length) {
      this.replaceSelected(first, null, index, selections);
    } else {
      index -= this[first].length;
      this.replaceSelected(second, null, index, selections);
    }
  else {
    if( index >= this[first].length ) return;
    var sidx = this.m_hashVisitor.getNextIndex( selections.length );
    var cidx = this[first][index];
    var ch = selections.charAt(sidx);
    this.m_sbPass = this.m_sbPass.substring(0, cidx) + ch + this.m_sbPass.substring(cidx+1);
    this[first] = this[first].slice(0, index).concat(this[first].slice(index+1, this[first].length));
  }
}
