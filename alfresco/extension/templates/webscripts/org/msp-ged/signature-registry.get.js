// Signature registry webscript
// Lists every document carrying the sg:signature aspect for the printable registry page.

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

// Visible si : initiateur du workflow, admin, ou document partagé (Shared / lien public)
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

var docs = [];
try {
    var results = search.query({
        query: 'ASPECT:"sg:signature"',
        language: 'fts-alfresco'
    });
    for (var i = 0; i < results.length; i++) {
        var d = results[i];
        if (d == null) continue;
        var props = d.properties;
        var initBy = '' + (props['sg:initiatedBy'] || '');
        if (!isAdmin && initBy != currentUser && !isSharedDoc(d)) continue;
        var status = props['sg:signatureStatus'] || '';
        var signerNames = [];
        var rawSigners = toList(props['sg:signatories']);
        for (var s = 0; s < rawSigners.length; s++) { signerNames.push(personName(rawSigners[s])); }
        var proofRef = props['sg:signatureProofNodeRef'] || '';
        docs.push({
            name: '' + d.name,
            nodeRef: d.nodeRef.toString(),
            status: '' + status,
            initiatedBy: '' + (props['sg:initiatedBy'] || ''),
            initiatedByName: personName(props['sg:initiatedBy'] || ''),
            signerNames: signerNames.join(', '),
            rejectedBy: '' + (props['sg:rejectedBy'] || ''),
            rejectedByName: personName(props['sg:rejectedBy'] || ''),
            signatureDate: props['sg:signatureDate'] ? props['sg:signatureDate'].getTime() : 0,
            signatureDateStr: props['sg:signatureDate'] ? fmtDate(new Date(props['sg:signatureDate'].getTime())) : '',
            documentHash: '' + (props['sg:documentHash'] || ''),
            proofUrl: '/share/proxy/alfresco/msp-ged/signature-proof?nodeRef=' + encodeURIComponent(d.nodeRef.toString()) + '&format=html',
            signCount: props['sg:signCount'] != null ? props['sg:signCount'] : 0
        });
    }
} catch (e) {
    logger.error('signature-registry search failed: ' + e);
}

docs.sort(function(a, b) { return b.signatureDate - a.signatureDate; });
model.docs = docs;
