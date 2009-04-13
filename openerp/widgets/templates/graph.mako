<table width="100%" class="graph-table">
    <tr>
        <td align="center">
        
			<div class="graph" id="${chart_name}" 
			    style="width: ${width}; height: ${height}; min-width: 350px; min-height: 350px;"></div>

            <script type="text/javascript">

            	if (getElement('_terp_model').value == '${model}' && '${chart_type}'=='bar') {

            	 	var make_div = DIV({'id': 'make_resize', 'style': 'width: 100%; height: ${height};'});
            	    var graph_div = DIV({'class': 'graph', 'style': 'width: 100%; height: 99%;'});
            	    var resize_div = DIV({'class':'chart_resize'});

            	    MochiKit.DOM.appendChildNodes(make_div, graph_div);
            	    MochiKit.DOM.appendChildNodes(make_div, resize_div);

            	    MochiKit.DOM.swapDOM('${chart_name}', make_div);

            	    graph_div.id = '${chart_name}';

	        		resize = new MochiKit.DragAndDrop.Resizable('make_resize', {
		            	constraint: 'vertical',
		            	handle: 'chart_resize'
	        		});

	        		connect(MochiKit.DragAndDrop.Resizables, 'onStart', function(evt) {
	        				MochiKit.DOM.hideElement('swf_'+'${chart_name}');
	        		});
	        		connect(MochiKit.DragAndDrop.Resizables, 'onEnd', function(evt){
	        				MochiKit.DOM.showElement('swf_'+'${chart_name}');
	        		});
				}

        	</script>

            % if chart_type=='bar':
        	<script type="text/javascript">
                new BarChart('${chart_name}', "${utils.url('/graph/bar', _terp_model=model, _terp_view_id=view_id, _terp_ids=ustr(ids), _terp_domain=ustr(domain), _terp_context=ustr(context_))}");
            </script>
            % endif
            % if chart_type=='pie':
            <script type="text/javascript">
                new PieChart('${chart_name}', "${utils.url('/graph/pie', _terp_model=model, _terp_view_id=view_id, _terp_ids=ustr(ids), _terp_domain=ustr(domain), _terp_context=ustr(context_))}");
            </script>
            % endif
        </td>
    </tr>
</table>

