<%inherit file="/openerp/controllers/templates/xhr.mako"/>

<%def name="header()">
    <title>${_("Manage Views (%s)") % (model)}</title>
    <script type="text/javascript">
    
        function do_select(id, src){
            var radio = openobject.dom.get(src + '/' + id);
			if (radio) {
				radio.checked = true;
			}
        }
        
        function doCreate() {
            jQuery('form#view_form').submit();
        }
        
        function doCancel() {
            var edt = openobject.dom.get('view_editor');
            var lst = openobject.dom.get('view_list');
            
            edt.style.display = "none";
            lst.style.display = "";
        }
        
        function doClose() {
            window.close();
        }
        
        function onNew() {
            var edt = openobject.dom.get('view_editor');
            var lst = openobject.dom.get('view_list');
            
            var nm = openobject.dom.get('name');
            nm.value = openobject.dom.get('model').value + '.custom_' + Math.round(Math.random() * 1000);
            
            edt.style.display = "";
            lst.style.display = "none";
        }
        
        function onEdit() {
            
            var list = new ListView('_terp_list');
            var boxes = list.getSelectedItems();

            if (boxes.length == 0){
                alert(_('Please select a view...'));
                return;
            }

            var act = openobject.http.getURL('/viewed', {view_id: boxes[0].value});
            if (window.opener) {
                window.opener.setTimeout("openobject.tools.openWindow('" + act + "')", 0);
                window.close();
            } else {
                openobject.tools.openWindow(act);
            }
        }
        
        function onRemove() {
        
            var list = new ListView('_terp_list');
            var boxes = list.getSelectedItems();

            if (boxes.length == 0){
                alert(_('Please select a view...'));
                return;
            }
            
            if (!window.confirm(_('Do you really want to remove this view?'))){
                return;
            }
            
            window.location.href = openobject.http.getURL('/viewlist/delete?model=${model}&id=' + boxes[0].value);
        }
		
        jQuery(document).ready(function(){
            
            if (!window.opener) 
                return;

            var id = window.opener.document.getElementById('_terp_view_id').value;
            
            if (!openobject.dom.get('_terp_list/' + id)) {
                
                var list = new ListView('_terp_list');
                var ids = list.getRecords();

                if (ids.length) {
                    id = ids[0];
                }
            }
            
            do_select(parseInt(id), '_terp_list');
        });		
        
    </script>
</%def>

<%def name="content()">
    <table id="view_list" class="view" cellspacing="5" border="0" width="100%">
        <tr>
            <td>
                <table width="100%" class="titlebar">
                    <tr>
                        <td width="32px" align="center">
                            <img src="/openerp/static/images/stock/gtk-find.png"/>
                        </td>
                        <td width="100%">${_("Manage Views (%s)") % (model)}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td>${screen.display()}</td>
        </tr>
        <tr>
            <td>
                <div class="toolbar">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td>
                                <button type="button" onclick="onNew()">${_("New")}</button>
                                <button type="button" onclick="onEdit()">${_("Edit")}</button>
                                <button type="button" onclick="onRemove()">${_("Remove")}</button>
                            </td>
                            <td width="100%"></td>
                            <td>
                                <button type="button" onclick="doClose()">${_("Close")}</button>
                            </td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>
    
    <table id="view_editor" style="display: none;" class="view" cellspacing="5" border="0" width="100%">
        <tr>
            <td>
                <table width="100%" class="titlebar">
                    <tr>
                        <td width="32px" align="center">
                            <img src="/openerp/static/images/stock/gtk-edit.png"/>
                        </td>
                        <td width="100%">${_("Create a view (%s)") % (model)}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td>
                <form id="view_form" action="/viewlist/create">
                    <input type="hidden" id="model" name="model" value="${model}"/>
                    <table width="400" align="center" class="fields">
                        <tr>
                            <td class="label">${_("View Name:")}</td>
                            <td class="item"><input type="text" id="name" name="name" class="requiredfield"/></td>
                        </tr>
                        <tr>
                            <td class="label">${_("View Type:")}</td>
                            <td class="item">
                                <select id="type" name="type" class="requiredfield">
                                    <option value="form">Form</option>
                                    <option value="tree">Tree</option>
                                    <option value="graph">Graph</option>
                                    <option value="calendar">Calendar</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">${_("Priority:")}</td>
                            <td class="item"><input type="text" id="priority" name="priority" value="16" class="requiredfield"/></td>
                        </tr>
                    </table>
                </form>
            </td>
        </tr>
        <tr>
            <td>
                <div class="toolbar">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td width="100%"></td>
                            <td>
                                <button type="button" onclick="doCreate()">${_("Save")}</button>
                                <button type="button" onclick="doCancel()">${_("Cancel")}</button>
                            </td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>
</%def>
