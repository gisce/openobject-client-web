///////////////////////////////////////////////////////////////////////////////
//
// Copyright (c) 2007 TinyERP Pvt Ltd. (http://tinyerp.com) All Rights Reserved.
//
// $Id$
//
// WARNING: This program as such is intended to be used by professional
// programmers who take the whole responsability of assessing all potential
// consequences resulting from its eventual inadequacies and bugs
// End users who are looking for a ready-to-use solution with commercial
// garantees and support are strongly adviced to contract a Free Software
// Service Company
//
// This program is Free Software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
//
///////////////////////////////////////////////////////////////////////////////

var Browser = {
    
    // Is Internet Explorer?
    isIE : /msie/.test(navigator.userAgent.toLowerCase()),
    
    // Is Internet Explorer 6?
    isIE6 : /msie 6/.test(navigator.userAgent.toLowerCase()),
    
    // Is Internet Explorer 7?
    isIE7 : /msie 7/.test(navigator.userAgent.toLowerCase()),

    // Is Mozilla derived?
    isMozilla : /mozilla/.test(navigator.userAgent.toLowerCase()),
    
    // Is Apple WebKit derived?
    isWebKit : /webkit/.test(navigator.userAgent.toLowerCase()),
    
    // Is opera?
    isOpera : /opera/.test(navigator.userAgent.toLowerCase())
}

function elementPosition2(elem) {
    var x = y = 0;
    if (elem.offsetParent) {
        x = elem.offsetLeft
        y = elem.offsetTop
        while (elem = elem.offsetParent) {
            x += elem.offsetLeft
            y += elem.offsetTop
        }
    }
    return {x: x, y: y};
}

///////////////////////////////////////////////////////////////////////////////

MochiKit.Base.update(Date.prototype, {

    getWeek : function() {
        var first = new Date(this.getFullYear(), 0, 1);
        var self = new Date(this.getFullYear(), this.getMonth(), this.getDate());
        return Math.ceil((((self - first) / 86400000) + first.getDay()) / 7);
    },
    
    // day of the week (Sunday as last day)
    getWeekDay : function(){
    	return this.getDay() == 0 ? 6 : this.getDay() - 1;
    },
    
    getNext : function() {
        return new Date(this.getTime() + 24 * 60 * 60 * 1000);
    },
    
    getPrevious : function() {
        return new Date(this.getTime() - 24 * 60 * 60 * 1000);
    }
});

///////////////////////////////////////////////////////////////////////////////

var CAL_INSTALCE = null;

var getCalendar = function(action) {
    var act = action ? action : '/calendar/get/' + $('_terp_calendar_args').value;
    
    var contents = formContents('view_form');
    var params = {};
    
    for(var i in contents[0]){
        var k = contents[0][i];
        var v = contents[1][i];
        
        params[k] = [v];
    }
    
    // colors
    var colors = getElementsByTagAndClassName('input', null, 'calGroups');
    var values = [];
    
    colors = filter(function(e){return e.checked}, colors);
    forEach(colors, function(e){
        values = values.concat(e.value);
    });
    
    params['_terp_colors'] = "[" + values.join(",") + "]";
    
    showElement('calLoading');        

    var req = Ajax.post(act, params);
    req.addCallback(function(xmlHttp){
        
        var d = DIV();
        d.innerHTML = xmlHttp.responseText;

        var newContainer = d.getElementsByTagName('table')[0];
        
        // release resources
        CAL_INSTALCE.__delete__();
        
        swapDOM('calContainer', newContainer);

        var ua = navigator.userAgent.toLowerCase();
        
        if ((navigator.appName != 'Netscape') || (ua.indexOf('safari') != -1)) {
            // execute JavaScript
            var scripts = getElementsByTagAndClassName('script', null, newContainer);
            forEach(scripts, function(s){
                eval(s.innerHTML);
            });
        }
        
        CAL_INSTALCE.onResize();

    });
}

var getMiniCalendar = function(action) {
    var req = Ajax.post(action);
    
    req.addCallback(function(xmlHttp){
        
        var d = DIV();
        d.innerHTML = xmlHttp.responseText;

        var newMiniCalendar = d.getElementsByTagName('div')[0];                               
        
        swapDOM('MiniCalendar', newMiniCalendar);
    });
}

var saveCalendarRecord = function(record_id, starts, ends){

    var params = {
        '_terp_id': record_id,
        '_terp_model': $('_terp_model').value,
        '_terp_fields': $('_terp_calendar_fields').value,
        '_terp_starts' : starts,
        '_terp_ends' : ends,
        '_terp_context': $('_terp_context').value
    }
    
    var req = Ajax.post('/calendar/save', params);
    req.addCallback(function(xmlHttp){
    });
}

var editCalendarRecord = function(record_id){

    var act = getURL('/calpopup/edit', {id: record_id,
                                        model: $('_terp_model').value,
                                        view_ids: $('_terp_view_ids').value,
                                        view_mode: $('_terp_view_mode').value});
    openWindow(act);
}

