/*
 * Copyright (c) 2010, BeeDesk, Inc., unless otherwise noted.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL BeeDesk, Inc. AND ITS LICENSORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

jQuery.fn.reverse = [].reverse;

var Dates = new function() {
  // <Mike Koss> - released into the public domain.
  // Obtained from pageforest.com
  //------------------------------------------------------------------
  // ISO 8601 Date Formatting YYYY-MM-DDTHH:MM:SS.sssZ (where Z
  // could be +HH or -HH for non UTC) Note that dates are inherently
  // stored at UTC dates internally. But we infer that they denote
  // local times by default. If the dt.__tz exists, it is assumed to
  // be an integer number of hours offset to the timezone for which
  // the time is to be indicated (e.g., PST = -08). Callers should
  // set dt.__tz = 0 to fix the date at UTC. All other times are
  // adjusted to designate the local timezone.
  // -----------------------------------------------------------------

  // Default timezone = local timezone
  var tzDefault = -(new Date().getTimezoneOffset()) / 60;

  // Return an integer as a string using a fixed number of digits,
  // (require a sign if fSign).
  function fixedDigits(value, digits, fSign) {
      var s = "";
      var fNeg = (value < 0);
      if (digits == undefined) {
          digits = 0;
      }
      if (fNeg) {
          value = -value;
      }
      value = Math.floor(value);

      for (; digits > 0; digits--) {
          s = (value % 10) + s;
          value = Math.floor(value / 10);
      }

      if (fSign || fNeg) {
          s = (fNeg ? "-" : "+") + s;
      }

      return s;
  }

  this.toISODate = function(dt, fTime) {
      var dtT = new Date();
      dtT.setTime(dt.getTime());

      var tz = dt.__tz;
      if (tz == undefined) {
          tz = tzDefault;
      }

      // Adjust the internal (UTC) time to be the local timezone
      // (add tz hours) Note that setTime() and getTime() are always
      // in (internal) UTC time.
      if (tz != 0) {
          dtT.setTime(dtT.getTime() + 60 * 60 * 1000 * tz);
      }

      var s = dtT.getUTCFullYear() + "-" +
          fixedDigits(dtT.getUTCMonth() + 1, 2) + "-" +
          fixedDigits(dtT.getUTCDate(), 2);
      var ms = dtT % (24 * 60 * 60 * 1000);

      if (ms || fTime || tz != 0) {
          s += "T" + fixedDigits(dtT.getUTCHours(), 2) + ":" +
              fixedDigits(dtT.getUTCMinutes(), 2);
          ms = ms % (60 * 1000);
          if (ms) {
              s += ":" + fixedDigits(dtT.getUTCSeconds(), 2);
          }
          if (ms % 1000) {
              s += "." + fixedDigits(dtT.getUTCMilliseconds(), 3);
          }
          if (tz == 0) {
              s += "Z";
          } else {
              s += fixedDigits(tz, 2, true);
          }
      }
      return s;
  };

  var regISO = new RegExp("^(\\d{4})-?(\\d\\d)-?(\\d\\d)" +
                          "(T(\\d\\d):?(\\d\\d):?((\\d\\d)" +
                          "(\\.(\\d{0,6}))?)?(Z|[\\+-]\\d\\d))?$");

  //--------------------------------------------------------------------
  // Parser is more lenient than formatter. Punctuation between date
  // and time parts is optional. We require at the minimum,
  // YYYY-MM-DD. If a time is given, we require at least HH:MM.
  // YYYY-MM-DDTHH:MM:SS.sssZ as well as YYYYMMDDTHHMMSS.sssZ are
  // both acceptable. Note that YYYY-MM-DD is ambiguous. Without a
  // timezone indicator we don't know if this is a UTC midnight or
  // Local midnight. We default to UTC midnight (the ISOFromDate
  // function always writes out non-UTC times so we can append the
  // time zone). Fractional seconds can be from 0 to 6 digits
  // (microseconds maximum)
  // -------------------------------------------------------------------
  this.fromISODate = function(sISO) {
      Arguments.assertNonNullString(sISO, 'expect non null string.');
      var e = {"YYYY": 1, "MM": 2, "DD": 3, "hh": 5,
               'mm': 6, "ss": 8, "sss": 10, "tz": 11};
      var aParts = sISO.match(regISO);
      if (!aParts) {
          return undefined;
      }

      aParts[e.mm] = aParts[e.mm] || 0;
      aParts[e.ss] = aParts[e.ss] || 0;
      aParts[e.sss] = aParts[e.sss] || 0;

      // Convert fractional seconds to milliseconds
      aParts[e.sss] = Math.round(+('0.' + aParts[e.sss]) * 1000);
      if (!aParts[e.tz] || aParts[e.tz] === "Z") {
          aParts[e.tz] = 0;
      } else {
          aParts[e.tz] = parseInt(aParts[e.tz]);
      }

      // Out of bounds checking - we don't check days of the month is correct!
      if (aParts[e.MM] > 59 || aParts[e.DD] > 31 ||
          aParts[e.hh] > 23 || aParts[e.mm] > 59 || aParts[e.ss] > 59 ||
          aParts[e.tz] < -23 || aParts[e.tz] > 23) {
          return undefined;
      }

      var dt = new Date();

      dt.setUTCFullYear(aParts[e.YYYY], aParts[e.MM] - 1, aParts[e.DD]);

      if (aParts[e.hh]) {
          dt.setUTCHours(aParts[e.hh], aParts[e.mm],
                         aParts[e.ss], aParts[e.sss]);
      } else {
          dt.setUTCHours(0, 0, 0, 0);
      }

      // BUG: For best compatibility - could set tz to undefined if
      // it is our local tz Correct time to UTC standard (utc = t -
      // tz)
      dt.__tz = aParts[e.tz];
      if (aParts[e.tz]) {
          dt.setTime(dt.getTime() - dt.__tz * (60 * 60 * 1000));
      }
      return dt;
  };
  // </Mike Koss>
  return this;
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

  this.search = function(q) {
    // Andy E and other @http://stackoverflow.com/posts/2880929/revisions
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
  this.trim = function(str) {
    return str.replace(/^\s+|\s+$/, '');
  };
  return this;
};

var Hashs = new function() {
  this.apply = function(fn, items) {
    var result = {};
    for (var key in items) {
      result[key] = fn(key, items[key]);
    }
    return result;
  };
  this.has = function(obj, key) {
    var result = false;
    if (!!obj) {
      for (var name in obj) {
        if (name === key) {
          result = true;
          break;
        }
      }
    }
    return result;
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
  this.keys = function(hash) {
    for (var key in hash) {
      this.push(key);
    }
    return this;
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
  this.arrayremove = function(from, to) {
    //Array Remove - By John Resig (MIT Licensed)
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
  };
  return this;
};

var Arguments = new function() {

  var instance = this;

  this.isNonNull = function(arg) {
    return (arg !== undefined && arg !== null);
  };
  this.assertNonNull = function(arg, message) {
    if (!instance.isNonNull(arg)) {
      throw(message || 'Parameter is null');
    }
  };
  this.warnNonNull = function(arg, message) {
    if (!instance.isNonNull(arg)) {
      console.warn(message || 'Parameter is null');
    }
  };
  this.isNonNullString = function(arg) {
    return (arg !== undefined && arg !== null && typeof(arg) === 'string');
  };
  this.assertNonNullString = function(arg, message) {
    if (!instance.isNonNullString(arg)) {
      throw(message || 'Parameter is null');
    }
  };
  this.warnNonNullString = function(arg, message) {
    if (!instance.isNonNullString(arg)) {
      console.warn(message || 'Parameter is null');
    }
  };
  this.isNonNullFn = function(arg) {
    return (arg !== undefined && arg !== null && $.isFunction(arg));
  };
  this.assertNonNullFn = function(arg, message) {
    if (!instance.isNonNullFn(arg)) {
      throw(message || 'Parameter is null');
    }
  };
  this.assertNonNullFn = function(arg, message) {
    if (!instance.isNonNullFn(arg)) {
      console.warn(message || 'Parameter is null');
    }
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
