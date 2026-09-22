// Signature proof webscript
// Returns the audit trail stored on a document (sg:signature / sg:signatureLog)
// so clients can display or print the signature history.

function toList(value) {
    var out = [];
    if (value == null) return out;
    try {
        for (var i = 0; i < value.size(); i++) { out.push('' + value.get(i)); }
        return out;
    } catch (e1) {}
    try {
        for (var j = 0; j < value.length; j++) { out.push('' + value[j]); }
        if (out.length > 0) return out;
    } catch (e2) {}
    out.push('' + value);
    return out;
}

function personName(userName) {
    try {
        var p = people.getPerson(userName);
        if (p != null) {
            var fn = ((p.properties.firstName || '') + ' ' + (p.properties.lastName || '')).trim();
            if (fn != '') return fn;
        }
    } catch (e) {}
    return '' + userName;
}

function fmtDate(d) {
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

var currentUser = null;
var isAdmin = false;
try {
    var ctx = Packages.org.springframework.web.context.ContextLoader.getCurrentWebApplicationContext();
    currentUser = ctx.getBean('AuthenticationService').getCurrentUserName();
    isAdmin = ctx.getBean('authorityService', Packages.org.alfresco.service.cmr.security.AuthorityService).hasAdminAuthority();
} catch (e) { currentUser = 'admin'; }

// A document counts as "shared" if it lives under Shared (documents partagés)
// or has been shared via the Share link action (qshare:shared aspect)
function isSharedDoc(doc) {
    try {
        var qp = '' + doc.qnamePath;
        if (qp.indexOf('/app:shared/') != -1) return true;
    } catch (e) {}
    try {
        var p = '' + doc.displayPath;
        if (p.indexOf('/Shared') == 0 || p.indexOf('/Company Home/Shared') == 0) return true;
    } catch (e) {}
    try { if (doc.hasAspect('qshare:shared')) return true; } catch (e) {}
    return false;
}

var nodeRef = args.nodeRef;
var doc = null;
if (nodeRef != null && nodeRef != '') {
    try { doc = search.findNode(nodeRef); } catch (e) { doc = null; }
}

// Proof is visible only to the workflow initiator (and admins),
// unless the document has been shared / placed under Shared
var props0 = doc != null ? doc.properties : null;
var initiator0 = props0 != null ? (props0['sg:initiatedBy'] || '') : '';
var allowed = (doc != null && doc.hasAspect('sg:signature')) &&
              (isAdmin || initiator0 == currentUser || isSharedDoc(doc));

if (!allowed) {
    model.found = false;
} else {
    model.found = true;
    var props = doc.properties;
    model.documentName = '' + doc.name;
    model.nodeRef = doc.nodeRef.toString();
    model.status = props['sg:signatureStatus'] || '';
    model.initiatedBy = props['sg:initiatedBy'] || '';
    model.initiatedByName = personName(props['sg:initiatedBy'] || '');
    model.workflowId = props['sg:signatureWorkflowId'] || '';
    model.documentHash = props['sg:documentHash'] || '';
    model.signatureDate = props['sg:signatureDate'] ? props['sg:signatureDate'].getTime() : 0;
    model.signatureDateStr = props['sg:signatureDate'] ? fmtDate(new Date(props['sg:signatureDate'].getTime())) : '';

    var proofRef = props['sg:signatureProofNodeRef'] || '';
    model.proofNodeRef = '' + proofRef;
    model.proofUrl = (proofRef != '') ? '/share/proxy/alfresco/api/node/' + ('' + proofRef).replace('://', '/') + '/content/preuve-signature.html' : '';

    var signatories = [];
    var rawSigners = toList(props['sg:signatories']);
    for (var s = 0; s < rawSigners.length; s++) { signatories.push(personName(rawSigners[s])); }
    model.signatories = signatories;

    var entries = [];
    var rawLog = toList(props['sg:signatureLog']);
    for (var i = 0; i < rawLog.length; i++) {
        var p = ('' + rawLog[i]).split('|');
        entries.push({
            date: p.length > 0 ? p[0] : '',
            signer: p.length > 1 ? p[1] : '',
            signerName: p.length > 2 ? p[2] : '',
            action: p.length > 3 ? p[3] : '',
            hash: p.length > 4 ? p[4] : '',
            taskId: p.length > 5 ? p[5] : '',
            comment: p.length > 6 ? p[6] : '',
            workflowId: p.length > 7 ? p[7] : ''
        });
    }
    model.entries = entries;
}
