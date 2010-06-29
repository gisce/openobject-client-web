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

openobject.tools = {

    openWindow: function(anchor, options) {

        var opts = MochiKit.Base.update({
            name        : 'win' + Math.round(Math.random() * 100000),
            center      : true,
            x           : null,
            y           : null,
            width       : 800, //screen.availWidth - 200,
            height      : 600, //screen.availHeight - 200,
            scrollbars  : true,
            fullscreen  : false,
            menubar     : false,
            locationbar : false,
            resizable   : true
        }, options || {});

        //opts.width = opts.width > 0 ? opts.width : 800;
        //opts.height = opts.height > 0 ? opts.height : 600;

        var args = '';

        args += "height=" + (opts.fullscreen ? screen.availHeight : opts.height) + ",";
        args += "width=" + (opts.fullscreen ? screen.availWidth : opts.width) + ",";

        if (!opts.center) {
            opts.x = 0;
            opts.y = 0;
            args += "screenx=" + opts.x + ",";
            args += "screeny=" + opts.y + ",";
            args += "left=" + opts.x + ",";
            args += "top=" + opts.y + ",";
        }

        if (opts.center && !opts.fullscreen) {
            opts.y = Math.floor((screen.availHeight - opts.height - (screen.height - screen.availHeight)) / 2);
            opts.x = Math.floor((screen.availWidth - opts.width - (screen.width - screen.availWidth)) / 2);
            args += "screenx=" + opts.x + ",";
            args += "screeny=" + opts.y + ",";
            args += "left=" + opts.x + ",";
            args += "top=" + opts.y + ",";
        }

        if (opts.scrollbars) {
            args += "scrollbars=1,";
        }
        if (opts.menubar) {
            args += "menubar=1,";
        }
        if (opts.locationbar) {
            args += "location=1,";
        }
        if (opts.resizable) {
            args += "resizable=1,";
        }

        var win = window.open(openobject.http.getURL(anchor), opts.name, args);
        return false;

    },

    validateEmail: function(value) {
        var re = /((^[a-z]([a-z_\.]*)@([a-z_\.]*)([.][a-z]{3})$)|(^[a-z]([a-z_\.]*)@([a-z_\.]*)(\.[a-z]{3})(\.[a-z]{2})*[\s,.]*$))*/i;
        return re.test(value);
    },

    validateURL: function(value) {

    }
};

// vim: ts=4 sts=4 sw=4 si et
