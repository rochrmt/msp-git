// Signature notifications webscript
// Returns recent notification events for the current user (ASSIGNMENT, SIGNED, REJECTED, COMPLETED)
// with read flag so the client can show unread count and hide read items.

var now = Date.now();

// Get current user via Spring AuthenticationService bean
var currentUser = null;
try {
    var authBean = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext().getBean("AuthenticationService");
    currentUser = authBean.getCurrentUserName();
} catch (e) {
    currentUser = 'admin';
}

// Search for notification nodes by PATH (more reliable than ASPECT search)
var notifFolder = null;
try {
    var pathResults = search.query({
        query: 'PATH:"/app:company_home/app:shared/cm:Signature_x0020_Notifications"',
        language: 'fts-alfresco'
    });
    if (pathResults && pathResults.length > 0) {
        notifFolder = pathResults[0];
    }
} catch(pathErr) {
    // Fallback: try lucene
    try {
        var pathResults2 = search.luceneSearch('PATH:"/app:company_home/app:shared/cm:Signature_x0020_Notifications"');
        if (pathResults2 && pathResults2.length > 0) {
            notifFolder = pathResults2[0];
        }
    } catch(pathErr2) {
        // ignore
    }
}

var notifications = [];
if (notifFolder) {
    var children = notifFolder.children;
    for (var i = 0; i < children.length; i++) {
        var node = children[i];
        var props = node.properties;
        var recipient = props['sg:recipient'] || '';

        // Only include notifications for the current user
        if (recipient == currentUser) {
            var notifDate = props['sg:notificationDate'] ? props['sg:notificationDate'].getTime() : 0;

            var notification = {
                nodeId: node.nodeRef.toString(),
                eventType: props['sg:eventType'] || '',
                documentName: props['sg:notificationDocumentName'] || '',
                signerName: props['sg:signerName'] || '',
                recipient: props['sg:recipient'] || '',
                workflowId: props['sg:workflowId'] || '',
                documentNodeRef: props['sg:documentNodeRef'] || '',
                taskId: props['sg:taskId'] || '',
                read: props['sg:notificationRead'] === true,
                notificationDate: notifDate
            };
            notifications.push(notification);
        }
    }
}

// Most recent first, cap at 50
notifications.sort(function(a, b) { return b.notificationDate - a.notificationDate; });
if (notifications.length > 50) {
    notifications = notifications.slice(0, 50);
}

model.notifications = notifications;
model.timestamp = now;
