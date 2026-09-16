<#assign el=args.htmlid?html>
<#assign aboutConfig=config.scoped["Edition"]["about"]>
<div id="${el}-dialog" class="about-share">
   <div class="bd">
      <div id="${el}-logo" class="${aboutConfig.getChildValue("css-class")!logo-com} logo">
         <div class="about">
            <#assign split=serverVersion?index_of(" ")>
            <div class="header">${msg("app.name")} v${shareVersion?html}</div>
            <div>(${shareBuild?html}<#if shareLibs?size != 0>, Aikau ${shareLibs.aikau?html},  Spring Surf ${shareLibs.surf?html}, Spring WebScripts ${shareLibs.webscripts?html}, Freemarker ${shareLibs.freemarker?html}, Rhino ${shareLibs.rhino?html}, Yui ${shareLibs.yui?html}</#if>)</div>
            <div class="header">${msg("app.name")} ${serverEdition?html} v${serverVersion?substring(0, split)?html}</div>
            <div>${serverVersion?substring(split+1)?html} schema ${serverSchema?html}</div>
            <div class="licenseHolder"><#if licenseHolder != "" && licenseHolder != "UNKNOWN"><span>${msg("label.licensedTo")}</span> ${licenseHolder}<#else>&nbsp;</#if></div>
            <div class="copy">
               <span>${msg("label.copyright")}</span>
            </div>
         </div>
      </div>
   </div>
</div>
