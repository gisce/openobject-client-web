<%inherit file="master.mako"/>

<%def name="header()">
    <title>${_("Login")}</title>
</%def>

<%def name="content()">
    <div class="view">

        <br/>

        <center>
            ${cp.root.developped_by()|n}
        </center>

        <br/>

        <form action="${target}" method="post" name="loginform">
            % for key, value in origArgs.items():
            <input type="hidden" name="${key}" value="${value}"/>
            % endfor
            <input type="hidden" name="login_action" value="login"/>
        
            <div class="box2 welcome">${_("Welcome to OpenERP")}</div>

            <div class="box2">
                <table align="center" cellspacing="2px" border="0">
                    <tr>
                        <td class="label">${_("Database:")}</td>
                        <td>
                            % if dblist is None:
                                <input type="text" name="db" style="width: 300px;" value="${db}"/>
                            % else:
                            <select name="db" style="width: 302px;">
                                % for v in dblist:
                                <option value="${v}" ${v==db and "selected" or ""}>${v}</option>
                                % endfor
                            </select>
                            % endif
                        </td>
                    </tr>

                    <tr>
                        <td class="label">${_("User:")}</td>
                        <td><input type="text" id="user" name="user" style="width: 300px;" value="${user}"/></td>
                    </tr>
                    
                    <tr>
                        <td class="label">${_("Password:")}</td>
                        <td><input type="password" value="${password}" id="password" name="password" style="width: 300px;"/></td>
                    </tr>
                    <tr>
                        <td></td>
                        <td align="right">
                            % if cp.config('dbbutton.visible', 'openerp-web'):
                            <button type="button" style="white-space: nowrap" tabindex="-1" onclick="location.href='/database'">${_("Databases")}</button>
                            % endif
                            <button type="submit" style="width: 80px; white-space: nowrap">${_("Login")}</button>
                        </td>
                    </tr>
                </table>                
            </div>            
        </form>
    
        % if message:
        <div class="box2 message" id="message">${message}</div>
        % endif
        
        % if info:
        <div class="information">${info|n}</div>
        % endif
    </div>
</%def>
