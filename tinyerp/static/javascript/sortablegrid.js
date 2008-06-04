////////////////////////////////////////////////////////////////////////////////
//
// Copyright (C) 2007-TODAY Tiny ERP Pvt. Ltd. (http://openerp.com) All Rights Reserved.
//
// $Id$
//
// WARNING: This program as such is intended to be used by professional
// programmers who take the whole responsibility of assessing all potential
// consequences resulting from its eventual inadequacies and bugs
// End users who are looking for a ready-to-use solution with commercial
// guarantees and support are strongly advised to contract a Free Software
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
// along with this program; if not, write to the 
// Free Software Foundation, Inc., 59 Temple Place - Suite 330, 
// Boston, MA  02111-1307, USA.
//
////////////////////////////////////////////////////////////////////////////////

// Based on MochiKit `sortable_table` demo

mouseOverFunc = function () {
    try{
        addElementClass(this, "over");
    } catch(e){}
};

mouseOutFunc = function () {
    try{
        removeElementClass(this, "over");
    } catch(e){}
};

ignoreEvent = function (ev) {
    if (ev && ev.preventDefault) {
        ev.preventDefault();
        ev.stopPropagation();
    } else if (typeof(event) != 'undefined') {
        event.cancelBubble = false;
        event.returnValue = false;
    }
};

SortableGrid = function (table, options) {
    this.__init__(table, options);
}

SortableGrid.prototype = {
    
    __init__ : function(table, options) {
        
        this.thead = null;
        this.tbody = null;
        this.columns = [];
        this.rows = [];
        this.sortState = {};
        this.sortkey = 0;

        table = getElement(table);
        
        // Find the thead
        this.thead = table.getElementsByTagName('thead')[0];
        
        // get the kind key and contents for each column header
        var cols = this.thead.getElementsByTagName('th');
        for (var i = 0; i < cols.length; i++) {
            var node = cols[i];
            var attr = null;
            try {
                attr = node.getAttribute("kind");
            } catch (err) {
                // pass
            }
            
            if (attr) {
                addElementClass(node, 'sortable');
            }
            
            var o = node.childNodes;
            this.columns.push({
                "format": attr,
                "element": node,
                "proto": attr ? node.cloneNode(true) : node
            });
        }
        
        // scrape the tbody for data
        this.tbody = table.getElementsByTagName('tbody')[0];
        // every row
        var rows = this.tbody.getElementsByTagName('tr');
        for (var i = 0; i < rows.length; i++) {
            // every cell
            var row = rows[i];
            var cols = row.getElementsByTagName('td');
            var rowData = [];
            for (var j = 0; j < cols.length; j++) {
                // scrape the text and build the appropriate object out of it
                var cell = cols[j];
                var obj = strip(scrapeText(cell));
                switch (this.columns[j].format) {
                    case 'date':
                    case 'datetime':
                        obj = MochiKit.DOM.getNodeAttribute(cell, 'sortable_value');
                        obj = isoTimestamp(obj) || obj;
                        break;
                    case 'float':
                        obj = MochiKit.DOM.getNodeAttribute(cell, 'sortable_value');
                        obj = parseFloat(obj) || 0;
                        break;
                    case 'integer':
                        obj = parseInt(obj) || 0;
                        break;
                    case 'many2many':
                    case 'one2many':
                        obj = obj.replace(/\((\d+)\)/g, '$1');
                        obj = parseInt(obj) || 0;
                        break;
                    default:
                        // default is case insensitive string comparison
                        obj = obj.toLowerCase();
                        break;
                }
                rowData.push(obj);
            }
            // stow away a reference to the TR and save it
            rowData.row = row.cloneNode(true);
            this.rows.push(rowData);

        }

        // do initial sort on first column
        //this.drawSortedRows(this.sortkey, true, false);
        this.drawColumnHeaders(-1, true, false);
    },

    onSortClick : function (name) {
        return method(this, function () {
            var order = this.sortState[name];
            if (order == null) {
                order = true;
            } else if (name == this.sortkey) {
                order = !order;
            }
            this.drawSortedRows(name, order, true);
            this.drawColumnHeaders(name, order, true);
        });
    },
    
    drawColumnHeaders : function (key, forward, clicked){
        
        for (var i = 0; i < this.columns.length; i++) {
            var col = this.columns[i];
            var node = col.proto.cloneNode(true);
            
            if (col.format) {
                // remove the existing events to minimize IE leaks
                col.element.onclick = null;
                col.element.onmousedown = null;
                col.element.onmouseover = null;
                col.element.onmouseout = null;
                
                // set new events for the new node                
                node.onclick = this.onSortClick(i);
                node.onmousedown = ignoreEvent;
                node.onmouseover = mouseOverFunc;
                node.onmouseout = mouseOutFunc;
            }
            
            // if this is the sorted column
            if (key == i && col.format) {
                
                var span = SPAN({'class': forward ? "sortup" : "sortdown"}, null);
                span.innerHTML = '&nbsp;&nbsp;&nbsp;';
                
                // add the character to the column header
                node.appendChild(span);
                
                if (clicked) {
                    node.onmouseover();
                }
            }
 
            // swap in the new th
            col.element = swapDOM(col.element, node);
        }
    },

    drawSortedRows : function (key, forward, clicked) {
        this.sortkey = key;
        // sort based on the state given (forward or reverse)
        var cmp = (forward ? keyComparator : reverseKeyComparator);
        this.rows.sort(cmp(key));
        // save it so we can flip next time
        this.sortState[key] = forward;
        // get every "row" element from this.rows and make a new tbody
        var newBody = TBODY(null, map(itemgetter("row"), this.rows));
        // swap in the new tbody
        this.tbody = swapDOM(this.tbody, newBody);
    }
}

// vim: sts=4 st=4 et
