function countItems(value) {
    if (value == null) return 0;
    try { return value.length; } catch (e1) {}
    try { return value.size(); } catch (e2) {}
    return 0;
}

function escapedQueryValue(value) {
    return ('' + value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function nodeTime(node, propertyName) {
    try {
        var value = node.properties[propertyName];
        return value ? value.getTime() : 0;
    } catch (e) {
        return 0;
    }
}

function isBusinessDocument(node) {
    if (node == null || !node.isDocument) return false;
    var name = ('' + node.name).toLowerCase();
    if (name == 'preuve-signature.html') return false;
    var path = '';
    try { path = '' + node.displayPath; } catch (e1) {}
    if (path.indexOf('/Shared/Preuves de signature') != -1) return false;
    if (path.indexOf('/Shared/Signature Notifications') != -1) return false;
    if (path.indexOf('/Comments') != -1 || path.indexOf('/Discussion ') != -1) return false;
    return true;
}

function displayLocation(node) {
    var path = '';
    try { path = '' + node.displayPath; } catch (e) {}
    path = path.replace(/^\/Company Home/, '');
    return path || '/';
}

function documentEntry(node) {
    var mimetype = '';
    var size = 0;
    try { mimetype = '' + node.mimetype; } catch (e1) {}
    try { size = Number(node.size) || 0; } catch (e2) {}
    return {
        name: '' + node.name,
        nodeRef: node.nodeRef.toString(),
        location: displayLocation(node),
        createdAt: nodeTime(node, 'cm:created'),
        modifiedAt: nodeTime(node, 'cm:modified'),
        mimetype: mimetype,
        size: size
    };
}

var currentUser = '';
try {
    var context = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    currentUser = '' + context.getBean('AuthenticationService').getCurrentUserName();
} catch (e) {}

var firstName = '';
var lastName = '';
try {
    var currentPerson = people.getPerson(currentUser);
    if (currentPerson != null) {
        firstName = '' + (currentPerson.properties.firstName || '');
        lastName = '' + (currentPerson.properties.lastName || '');
    }
} catch (e) {}

var activeTasks = 0;
var completedTasks = 0;
var sites = 0;
try { activeTasks = countItems(workflow.getAssignedTasks()); } catch (e) {}
try { completedTasks = countItems(workflow.getCompletedTasks()); } catch (e) {}
try { sites = countItems(siteService.listUserSites(currentUser)); } catch (e) {}

var recentDocuments = [];
var recentUploads = 0;
var thirtyDaysAgo = new Date().getTime() - (30 * 24 * 60 * 60 * 1000);
try {
    var recentResults = search.query({
        query: 'TYPE:"cm:content" AND @cm\\:creator:"' + escapedQueryValue(currentUser) + '"',
        language: 'fts-alfresco',
        page: { maxItems: 500, skipCount: 0 },
        sort: [{ column: 'cm:created', ascending: false }]
    });
    for (var i = 0; i < recentResults.length; i++) {
        var recentNode = recentResults[i];
        if (!isBusinessDocument(recentNode)) continue;
        if (nodeTime(recentNode, 'cm:created') >= thirtyDaysAgo) recentUploads++;
        if (recentDocuments.length < 6) recentDocuments.push(documentEntry(recentNode));
    }
} catch (e) {
    logger.warn('MSP-GED dashboard recent documents unavailable: ' + e);
}

var sharedDocuments = 0;
try {
    var sharedResults = search.query({
        query: 'TYPE:"cm:content" AND (ASPECT:"qshare:shared" OR PATH:"/app:company_home/app:shared//*")',
        language: 'fts-alfresco',
        page: { maxItems: 500, skipCount: 0 }
    });
    for (var j = 0; j < sharedResults.length; j++) {
        if (isBusinessDocument(sharedResults[j])) sharedDocuments++;
    }
} catch (e) {
    logger.warn('MSP-GED dashboard shared documents unavailable: ' + e);
}

model.userName = currentUser;
model.firstName = firstName;
model.lastName = lastName;
model.activeTasks = activeTasks;
model.completedTasks = completedTasks;
model.sites = sites;
model.sharedDocuments = sharedDocuments;
model.recentUploads = recentUploads;
model.recentDocuments = recentDocuments;
model.generatedAt = new Date().getTime();
