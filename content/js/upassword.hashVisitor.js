"use strict";

function hashVisitor(hashValue, upLength) {
  this.m_hashByte = hashValue;
  this.m_nPassLen = upLength; 
  this.m_iStartPos = 0;
  this.m_iCurPos = 0;
} 

hashVisitor.prototype.get8bitWithPosition = function(pos) {
    var high = pos % 2,
        bytepos = (pos - high) / 2,
        halfbyte;
    if(high == 1) {
      halfbyte = this.m_hashByte[bytepos] & 0x0F;
    } else {
      halfbyte = (this.m_hashByte[bytepos] >>> 4) & 0x0F;
    }
    return halfbyte;
  }
  
hashVisitor.prototype.get16bitWithPosition = function(pos) {
  var high = pos % 2,
      bytepos = (pos - high) / 2,
      halfbyte, newbyte;
  if(high == 1) {
    var nextpos = bytepos+1;
    if(nextpos >= this.m_hashByte.length) nextpos -= this.m_hashByte.length;
    halfbyte = this.m_hashByte[bytepos] & 0x0F;
    newbyte = (this.m_hashByte[nextpos] >>> 4) & 0x0F;
    newbyte = newbyte << 4;
    newbyte += halfbyte;
  } else {
    halfbyte = (this.m_hashByte[bytepos] >>> 4) & 0x0F;
    newbyte = (this.m_hashByte[bytepos] & 0x0F) << 4;
    newbyte += halfbyte;
  }
  return newbyte;
}

hashVisitor.prototype.get24bitWithPosition = function(pos) {
  var high = pos % 2,
      bytepos = (pos - high) / 2,
      nextpos = bytepos+1,
      halfbyte, bit24 = 0;
  if(nextpos >= this.m_hashByte.length) nextpos -= this.m_hashByte.length;
  if(high == 1) {
    halfbyte = (this.m_hashByte[nextpos] & 0x0F) << 8;
    bit24 = this.m_hashByte[nextpos] & 0xF0;
    bit24 += halfbyte;
    halfbyte = this.m_hashByte[bytepos] & 0x0F;
    bit24 += halfbyte;
  } else {
    halfbyte = (this.m_hashByte[bytepos] >>> 4) & 0x0F;
    bit24 = (this.m_hashByte[bytepos] & 0x0F) << 4;
    bit24 += halfbyte;
    halfbyte = (this.m_hashByte[nextpos] & 0xF0 ) << 4;
    bit24 += halfbyte;
  }
  return bit24;
}

hashVisitor.prototype.getNextIndex = function(maxIndex) {
  var idx = 0,
      cur = this.getNextPos();
  
  if (maxIndex >= 256) {
      idx = this.get24bitWithPosition(cur);
  } else if (maxIndex >= 16) {
    idx = this.get16bitWithPosition(cur);
  } else {
    idx = this.get8bitWithPosition(cur);
  }
  idx = idx % maxIndex;
  return idx;
}

hashVisitor.prototype.moveWithStep = function( start, step ) {
  var pos = start + step,
      doublelength = this.m_hashByte.length * 2;
  if( pos >= doublelength ) {
    pos -= doublelength;
  }
  return pos;
}

hashVisitor.prototype.getNextPos = function() {
  if( this.m_iStartPos == 0 && this.m_iCurPos == 0 ) {
    this.m_iCurPos = this.m_nPassLen - 1;
    this.m_iStartPos = this.m_iCurPos;
  } else {
    var step;
    this.m_iCurPos = this.moveWithStep( this.m_iCurPos, this.m_nPassLen - 1);
    step = this.m_iCurPos - this.m_iStartPos;
    if( step > 0 && step < (this.m_nPassLen - 1) ) {
      this.m_iCurPos = this.moveWithStep(this.m_iStartPos, 1);
      this.m_iStartPos = this.m_iCurPos;
    }
  }
  return this.m_iCurPos;
}


