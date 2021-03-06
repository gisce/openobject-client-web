////////////////////////////////////////////////////////////////////////////////
//
// Copyright (C) 2007-TODAY Tiny ERP Pvt Ltd. All Rights Reserved.
//
// $Id$
//
// Developed by Tiny (http://openerp.com) and Axelor (http://axelor.com).
//
// The OpenERP web client is distributed under the "OpenERP Public License".
// It's based on Mozilla Public License Version (MPL) 1.1 with following 
// restrictions:
//
// -   All names, links and logos of Tiny, Open ERP and Axelor must be 
//     kept as in original distribution without any changes in all software 
//     screens, especially in start-up page and the software header, even if 
//     the application source code has been changed or updated or code has been 
//     added.
//
// -   All distributions of the software must keep source code with OEPL.
// 
// -   All integrations to any other software must keep source code with OEPL.
//
// If you need commercial licence to remove this kind of restriction please
// contact us.
//
// You can see the MPL licence at: http://www.mozilla.org/MPL/MPL-1.1.html
//
////////////////////////////////////////////////////////////////////////////////

var ResizableTextarea = function(ta){
    this.__init__(ta);
}

ResizableTextarea.prototype = {
    
    __init__ : function(ta){
        this.textarea = MochiKit.DOM.getElement(ta);
        this.gripper = DIV({'class' : 'grip'});
        
        this.ta = this.textarea.cloneNode(true);
        
        MochiKit.DOM.swapDOM(this.textarea, DIV({'class' : 'resizable-textarea'}, this.ta, this.gripper));
        
        this.textarea = MochiKit.DOM.getElement(this.ta);        
        this.draggin = false;
        
        this.evtMouseDn = MochiKit.Signal.connect(this.gripper, 'onmousedown', this, "dragStart");
    },
    
    __delete__ : function(){
        MochiKit.Signal.disconnect(this.evtMouseDn);
    },
    
    dragStart : function(evt){
        
        if (!evt.mouse().button.left) 
            return;

        this.offset = elementDimensions(this.textarea).h - evt.mouse().page.y;
        
        this.evtMouseMv = MochiKit.Signal.connect(document, 'onmousemove', this, "dragUpdate");
        this.evtMouseUp = MochiKit.Signal.connect(document, 'onmouseup', this, "dragStop");
    },
    
    dragUpdate : function(evt){
        var h = Math.max(32, this.offset + evt.mouse().page.y);
        this.textarea.style.height = h + 'px';
	evt.stop();
    },
    
    dragStop : function(evt){
        //MochiKit.Signal.disconnect(this.evtMouseMv);
        //MochiKit.Signal.disconnect(this.evtMouseUp);
        MochiKit.Signal.disconnectAll(document, 'onmousemove', this, "dragUpdate");
        MochiKit.Signal.disconnectAll(document, 'onmouseup', this, "dragStop");
	evt.stop();
    }
}

// vim: ts=4 sts=4 sw=4 si et

