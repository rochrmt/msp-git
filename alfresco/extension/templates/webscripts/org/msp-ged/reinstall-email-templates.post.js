// Réécrit les templates email OOTB avec les versions MSP-GED
// POST /alfresco/service/msp-ged/reinstall-email-templates
// Les fichiers .ftl sont lus depuis le classpath alfresco/extension/email-templates/

var MAPPINGS = [
    // Workflow Notification (notification de tâche) : fr + défaut
    { nodePath: 'Data Dictionary/Email Templates/Workflow Notification/wf-email_fr.html.ftl', cp: 'wf-email_fr.html.ftl' },
    { nodePath: 'Data Dictionary/Email Templates/Workflow Notification/wf-email.html.ftl',    cp: 'wf-email_fr.html.ftl' },
    // Notify (notification de document) : fr + défaut
    { nodePath: 'Data Dictionary/Email Templates/Notify Email Templates/notify_user_email_fr.html.ftl', cp: 'notify_user_email_fr.html.ftl' },
    { nodePath: 'Data Dictionary/Email Templates/Notify Email Templates/notify_user_email.html.ftl',    cp: 'notify_user_email_fr.html.ftl' },
    // Invite
    { nodePath: 'Data Dictionary/Email Templates/Invite Email Templates/invite_user_email.ftl', cp: 'invite_user_email.ftl' }
];

function loadClasspath(name) {
    var res = new Packages.org.springframework.core.io.ClassPathResource("alfresco/extension/email-templates/" + name);
    var is = res.getInputStream();
    try {
        return Packages.org.apache.commons.io.IOUtils.toString(is, "UTF-8");
    } finally {
        is.close();
    }
}

var authUtil = Packages.org.alfresco.repo.security.authentication.AuthenticationUtil;
var results = [];

authUtil.runAsSystem(function() {
    var ctx = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    var nodeLocator = ctx.getBean("nodeLocatorService");
    var companyHomeRef = nodeLocator.getNode("companyhome", null, null);
    var companyHome = search.findNode(companyHomeRef.toString());
    for (var i = 0; i < MAPPINGS.length; i++) {
        var m = MAPPINGS[i];
        var status = "skipped";
        try {
            var node = companyHome.childByNamePath(m.nodePath);
            if (node != null) {
                node.content = loadClasspath(m.cp);
                node.save();
                status = "updated";
            } else {
                status = "not-found";
            }
        } catch (e) {
            status = "error: " + e;
        }
        results.push(m.nodePath + " -> " + status);
    }
});

model.results = results;
