Vous avez été invité à rejoindre l'espace « ${space.name} » par ${person.properties.firstName}<#if person.properties.lastName?exists> ${person.properties.lastName}</#if>.

<#if role?exists>Votre rôle : ${role}</#if>

Vous pouvez accéder à cet espace via MSP-GED :
<#assign ref=space.nodeRef>
<#assign workspace=ref[0..ref?index_of("://")-1]>
<#assign storenode=ref[ref?index_of("://")+3..]>
${url.serverPath}/alfresco/navigate/browse/${workspace}/${storenode}

Cordialement,

${person.properties.firstName}<#if person.properties.lastName?exists> ${person.properties.lastName}</#if>
—
Message automatique envoyé via MSP-GED — Ministère de la Santé et de la Population
