<table border="0" id="_o2m_${name}" width="100%" class="one2many" detail="${(screen.view_type == 'tree' or 0) and len(screen.widget.editors)}">
    <tr>
        <td>
            <table width="100%" class="gridview" style="border-bottom: 1px solid #C0C0C0;"cellpadding="0" cellspacing="0">
                <tr class="pagebar">
                    <%
                        if view_type == 'form':
                            pager_width = '15%'
                        else:
                            pager_width = '25%'
                    %>
                	<td class="pagerbar-cell" align="right" width="${pager_width}">
                		<div class="pagerbar-header">
                			<strong>${screen.string}</strong>
                		</div>
                	</td>
                	
                	% if screen.editable and not readonly and view_type == 'form':
                	   <td>
                	       <a class="button-a" href="javascript: void(0)" title="${_('Create new record...')}" onclick="new One2Many('${name}', ${(screen.view_type == 'tree' or 0) and len(screen.widget.editors)}).create()">${_('New')}</a>
                	   </td>
                	% endif
                	
                    % if pager_info:
                    <td width="75%" style="text-align: left" align="left">
                        <div class="pager">
                            <p id="_${name}_link_span" class="paging">
                                <a class="prev" title="${_('Previous record...')}" href="javascript: void(0)" onclick="submit_form('previous', '${name}')"></a>
                                <font>${pager_info}</font>
                                <a class="next" title="${_('Next record...')}" href="javascript: void(0)" onclick="submit_form('next', '${name}')"></a>
                            </p>                            
                        </div>
                    </td>
                    % endif
                    <td>
                        % if not screen.editable and screen.view_type=='form':
                        <img class="button" title="${_('Translate me.')}" alt="${_('Translate me.')}" 
                             src="/openerp/static/images/stock/stock_translate.png" width="16" height="16"
                             onclick="openobject.tools.openWindow(openobject.http.getURL('/openerp/translator', {_terp_model: '${screen.model}', _terp_id: ${screen.id}, _terp_context: $('_terp_context').value}));"/>
                        % endif
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        % if screen:
        <td>
            <input type="hidden" name="${name}/__id" id="${name}/__id" value="${id}" ${py.disabled(screen.view_type!="form")}/>
            <input type="hidden" name="${name}/_terp_default_get_ctx" id="${name}/_terp_default_get_ctx" value="${default_get_ctx}"/>
            ${screen.display()}
        </td>
        % endif
    </tr>
</table>