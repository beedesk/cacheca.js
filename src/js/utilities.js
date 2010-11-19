/*
 * Copyright (c) 2010, BeeDesk, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * * Neither the name of the BeeDesk, Inc. nor the
 *   names of its contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL BeeDesk, Inc. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.arrayremove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

Array.prototype.fillWithKey = function(hash) {
  for (var key in hash) {
    this.push(key);
  }
  return this;
};

String.prototype.trim = function() { return this.replace(/^\s+|\s+$/, ''); };

jQuery.fn.reverse = [].reverse;

// Credit: http://delete.me.uk/2005/03/iso8601.html
Date.parseISO8601 = function(string) {
  var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
      "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" +
      "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
  var d = string.match(new RegExp(regexp));

  var offset = 0;
  var date = new Date(d[1], 0, 1);

  if (d[3]) { date.setMonth(d[3] - 1); }
  if (d[5]) { date.setDate(d[5]); }
  if (d[7]) { date.setHours(d[7]); }
  if (d[8]) { date.setMinutes(d[8]); }
  if (d[10]) { date.setSeconds(d[10]); }
  if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
  if (d[14]) {
      offset = (Number(d[16]) * 60) + Number(d[17]);
      offset *= ((d[15] == '-') ? 1 : -1);
  }

  offset -= date.getTimezoneOffset();
  time = (Number(date) + (offset * 60 * 1000));
  date.setTime(Number(time));

  return date;
};

var HashSearch = new function() {
  this.getSearchString = function(search) {
    var result = '';
    for (var item in search) {
        if (result.length === 0) {
            result += '&';
        }
        result += item + '=' + encodeURIComponent(search[item]);
    }
    if (result.legnth > 0) {
        result += '?';
    }
    return result;
  };
  return this;

  // Andy E and other @http://stackoverflow.com/posts/2880929/revisions
  this.search = function(q) {
    var results = {};
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); };

    while (e = r.exec(q)) {
       results[d(e[1])] = d(e[2]);
    }
    return results;
  };
  return this;
};

var Strings = new function() {
  this.join = function(delim, strs) {
      if (strs.length == 0)
          return '';
      if (strs.length == 1)
          return strs[0];

      var result = strs[0];
      for (var i=1, len=strs.length; i<len; i++) {
          result += delim;
          result += strs[i];
      }
      return result;
  };
  this.fill = function(segment, count) {
    var result = [];
    if (count == 0) {
        // no op
    } else if (count == 1) {
      result[0] = segment;
    } else {
      for (var i=0; i<count; i++) {
        result[i] = segment;
      }
    }
    return result;
  };
  this.mysqlquote = function(name) {
    return "`" + name.replace("`", "``") + "`";
  };
  this.mssqlquote = function(name) {
    return "[" + name.replace("]", "]]") + "]";
  };
  return this;
};

var Arrays = new function() {
  this.apply = function(fn, items) {
    var result = [];
    for (var i = 0; i < items.length; ++i) {
      result[i] = fn(items[i]);
    }
    return result;
  };
  this.extract = function(names, entity) {
    var result = [];
    console.log('name: ' + uneval(names) + ' entity: ' + uneval(entity));
    for (var i = 0; i < names.length; ++i) {
      var item = entity[names[i]];
      if (item === undefined || item === null) {
        result[i] = null;
      } else {
        result[i] = item;
      }
    }
    return result;
  };
  this.intersect = function(ths, that, sorted) {
    // intersect 2 arrays and return 3 (left, middle, right) where the middle is
    // the intersect, left is left-only, etc.
    var ai=0, bi=0;
    var result = new Object();
    if (ths === undefined || ths === undefined) {
      ths = [];
    }
    if (that === undefined || that === undefined) {
      that = [];
    }
    if (sorted !== true) {
      ths.sort();
      that.sort();
    }
    result.left = new Array();
    result.middle = new Array();
    result.right = new Array();

    while(ai < ths.length || bi < that.length ) {
      if (bi >= that.length) {
        result.left.push(ths[ai]);
        ai++;
      } else if (ai >= ths.length) {
        result.right.push(that[bi]);
        bi++;
      } else if (ths[ai] < that[bi]) {
        result.left.push(ths[ai]);
        ai++;
      } else if (ths[ai] > that[bi]) {
        result.right.push(that[bi]);
        bi++;
      } else /* they're equal */ {
        result.middle.push(ths[ai]);
        ai++;
        bi++;
      }
    }
    return result;
  };
  this.collect = function(array) {
    var fn = function(entry) {
      array.push(entry);
    };
    return fn;
  };
  this.clone = function(array) {
    return array.slice(0);
  };
  return this;
};

var Base64 = new function() {
  // This code was written by Tyler Akins and has been placed in the
  // public domain.  It would be nice if you left this header intact.
  // Base64 code from Tyler Akins -- http://rumkin.com
  var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

  var ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf(" chrome/") >= 0 || ua.indexOf(" firefox/") >= 0 || ua.indexOf(' gecko/') >= 0) {
    var StringMaker = function () {
      this.str = "";
      this.length = 0;
      this.append = function (s) {
        this.str += s;
        this.length += s.length;
      };
      this.prepend = function (s) {
        this.str = s + this.str;
        this.length += s.length;
      };
      this.toString = function () {
        return this.str;
      };
    };
  } else {
    var StringMaker = function () {
      this.parts = [];
      this.length = 0;
      this.append = function (s) {
        this.parts.push(s);
        this.length += s.length;
      };
      this.prepend = function (s) {
        this.parts.unshift(s);
        this.length += s.length;
      };
      this.toString = function () {
        return this.parts.join('');
      };
    };
  }

  this.encode = function(input) {
    var output = new StringMaker();
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }
      output.append(keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4));
    }
    return output.toString();
  };

  this.decode = function(input) {
    var output = new StringMaker();
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    while (i < input.length) {
      enc1 = keyStr.indexOf(input.charAt(i++));
      enc2 = keyStr.indexOf(input.charAt(i++));
      enc3 = keyStr.indexOf(input.charAt(i++));
      enc4 = keyStr.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output.append(String.fromCharCode(chr1));

      if (enc3 != 64) {
        output.append(String.fromCharCode(chr2));
      }
      if (enc4 != 64) {
        output.append(String.fromCharCode(chr3));
      }
    }
    return output.toString();
  };

  return this;
};

/**
 * Random UUID-like string generator
 *
 * http://bytes.com/topic/javascript/answers/523253-how-create-guid-javascript
 */
function guid() {
  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};
