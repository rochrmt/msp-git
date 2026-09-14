// Mark signature notifications as read for the current user
// POST /msp-ged/signature-notifications-read
// Body/args: ids=workspace://SpacesStore/xxx,workspace://SpacesStore/yyy  OR  all=true

var currentUser = null;
try {
    var authBean = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext().getBean("AuthenticationService");
    currentUser = authBean.getCurrentUserName();
} catch (e) {
    currentUser = 'admin';
}

function markRead(node) {
    try {
        var authUtil = Packages.org.alfresco.repo.security.authentication.AuthenticationUtil;
        authUtil.runAsSystem(new Packages.org.alfresco.repo.security.authentication.AuthenticationUtil.RunAsWork({
            doWork: function() {
                node.properties['sg:notificationRead'] = true;
                node.save();
            }
        }));
        return true;
    } catch (e) {
        // Fallback: try direct write (works if user has write permission)
        try {
            node.properties['sg:notificationRead'] = true;
            node.save();
            return true;
        } catch (e2) {
            return false;
        }
    }
}

var updated = 0;
var argAll = (args && args['all']) || (url.args && url.args['all']);
var argIds = (args && args['ids']) || (url.args && url.args['ids']) || '';

if (argAll == 'true') {
    // Mark all notifications of the current user as read
    var notifFolder = null;
    try {
        var pathResults = search.query({
            query: 'PATH:"/app:company_home/app:shared/cm:Signature_x0020_Notifications"',
            language: 'fts-alfresco'
        });
        if (pathResults && pathResults.length > 0) {
            notifFolder = pathResults[0];
        }
    } catch (e) { /* ignore */ }

    if (notifFolder) {
        var children = notifFolder.children;
        for (var i = 0; i < children.length; i++) {
            var node = children[i];
            if (node.properties['sg:recipient'] == currentUser && node.properties['sg:notificationRead'] !== true) {
                if (markRead(node)) updated++;
            }
        }
    }
} else {
    var idList = argIds.split(',');
    for (var j = 0; j < idList.length; j++) {
        var ref = idList[j].replace(/^\s+|\s+$/g, '');
        if (ref.length === 0) continue;
        var node = search.findNode(ref);
        if (node && node.properties['sg:recipient'] == currentUser) {
            if (markRead(node)) updated++;
        }
    }
}

model.updated = updated;
