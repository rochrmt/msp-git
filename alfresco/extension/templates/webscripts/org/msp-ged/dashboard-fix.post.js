// dashboard-fix.post.js — remplace le dashlet my-documents par my-sites
// sur les dashboards utilisateur (objets surf:component sous surf-config/components).
// dryRun=true : liste sans modifier.

var dryRun = (args.dryRun == 'true' || args.dryRun == '1');
var fixed = [];
var scanned = 0;
var debug = [];

// Enumere les racines du store + le contenu du conteneur sys:
try {
    var rh = roothome.children;
    var rnames = [];
    for (var r = 0; r < rh.length; r++) {
        rnames.push(rh[r].name + ':' + rh[r].type);
        try {
            var sub = rh[r].children;
            var subnames = [];
            for (var s = 0; s < sub.length && s < 15; s++) {
                subnames.push(sub[s].name + ':' + sub[s].type);
                try {
                    var sub2 = sub[s].children;
                    var n2 = [];
                    for (var t = 0; t < sub2.length && t < 10; t++) n2.push(sub2[t].name + ':' + sub2[t].type);
                    if (n2.length > 0) debug.push('  ' + sub[s].name + ' -> ' + n2.join(', '));
                } catch (e3) {}
            }
            debug.push(rh[r].name + ' children: ' + subnames.join(', '));
        } catch (e2) {}
    }
    debug.push('store roots: ' + rnames.join(', '));
} catch (e) { debug.push('roothome err: ' + e); }

// Probe plusieurs emplacements possibles du store Surf
var probes = [
    'workspace://SpacesStore/surf-config',
    'workspace://SpacesStore/sys:surf-config',
    'workspace://SpacesStore/app:company_home/surf-config',
    'alfresco://user/store/alfrescoUserStore'
];
var surfConfig = null;
try {
    var sites = companyhome.childByNamePath('Sites');
    if (sites != null) surfConfig = sites.childByNamePath('surf-config');
} catch (e) { debug.push('Sites/surf-config err: ' + e); }
debug.push('Sites/surf-config -> ' + (surfConfig != null ? surfConfig.name : 'null'));
if (surfConfig != null) {
    try {
        var sc = surfConfig.children;
        var scnames = [];
        for (var sc2 = 0; sc2 < sc.length && sc2 < 20; sc2++) scnames.push(sc[sc2].name + ':' + sc[sc2].type);
        debug.push('surf-config children: ' + scnames.join(', '));
    } catch (e) { debug.push('surf-config children err: ' + e); }
}

var components = null;
if (surfConfig != null) {
    try { components = surfConfig.childByNamePath('components'); } catch (e) { components = null; }
    if (components == null) {
        try {
            var kids = surfConfig.children;
            var names = [];
            for (var k = 0; k < kids.length && k < 20; k++) names.push(kids[k].name + ':' + kids[k].type);
            debug.push('surf-config children: ' + names.join(', '));
        } catch (e) { debug.push('children err: ' + e); }
    }
}
debug.push('components found: ' + (components != null));

function inspectNode(c) {
    scanned++;
    var props = c.properties;
    var url = '' + (props['surf:url'] || '');
    var src = '' + (props['surf:sourceId'] || '');
    var reg = '' + (props['surf:regionId'] || '');
    if (scanned <= 40) debug.push('node ' + c.name + ' type=' + c.type + ' doc=' + c.isDocument);
    // Format objet (props surf:*) 
    if (url.indexOf('/components/dashlets/my-documents') != -1 &&
        src.indexOf('user/') != -1 && src.indexOf('dashboard') != -1) {
        if (!dryRun) {
            props['surf:url'] = '/components/dashlets/my-sites';
            c.save();
        }
        fixed.push(src + ' [' + reg + '] ' + url + ' -> my-sites' + (dryRun ? ' (dry)' : ''));
    }
    // Format fichier XML (cm:content)
    if (c.isDocument) {
        try {
            var xml = '' + c.content;
            // mode normalize: reecrit le XML au format sitedata (sans standalone ni espaces)
            if (args.normalize == 'true' && c.name.indexOf('dashboard') != -1) {
                var mm = xml.match(/<component>\s*<guid>([^<]*)<\/guid>\s*<scope>([^<]*)<\/scope>\s*<region-id>([^<]*)<\/region-id>\s*<source-id>([^<]*)<\/source-id>\s*<url>([^<]*)<\/url>\s*(<properties>([\s\S]*)<\/properties>)?/);
                if (mm) {
                    var propsXml = mm[6] ? mm[6].replace(/\s+/g, ' ').replace(/> </g, '><') : '';
                    var clean = '<?xml version="1.0" encoding="UTF-8"?><component><guid>' + mm[1] + '</guid><scope>' + mm[2] + '</scope><region-id>' + mm[3] + '</region-id><source-id>' + mm[4] + '</source-id><url>' + mm[5] + '</url>' + (propsXml ? propsXml : '') + '</component>';
                    if (!dryRun) { c.content = clean; }
                    fixed.push('NORM ' + c.name + (dryRun ? ' (dry)' : ''));
                }
            }
            // mode cible: args.setFile=nomfichier.xml&setUrl=/components/...
            if (args.setFile && args.setUrl && c.name == args.setFile) {
                if (!dryRun) {
                    c.content = xml.replace(/<url>[^<]*<\/url>/, '<url>' + args.setUrl + '</url>');
                }
                fixed.push('SET ' + c.name + ' url -> ' + args.setUrl + (dryRun ? ' (dry)' : ''));
            }
            // mode test: swap url via args.swap
            if (args.swapFrom && args.swapTo && xml.indexOf(args.swapFrom) != -1) {
                if (!dryRun) {
                    var re = new RegExp(args.swapFrom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                    c.content = xml.replace(re, args.swapTo);
                }
                fixed.push('SWAP ' + c.name + ': ' + args.swapFrom + ' -> ' + args.swapTo + (dryRun ? ' (dry)' : ''));
            }
            var m = xml.match(/<url>([^<]*)<\/url>/);
            if (c.name.indexOf('dashboard') != -1) {
                debug.push('  ' + c.name + ' url=' + (m ? m[1] : '?'));
                if (args.dump == 'true') debug.push('    XML: ' + xml.replace(/\s+/g, ' ').substring(0, 400));
            }
            if (xml.indexOf('/components/dashlets/my-documents') != -1 && xml.indexOf('dashboard') != -1) {
                if (!dryRun) {
                    c.content = xml.replace(/\/components\/dashlets\/my-documents/g, '/components/dashlets/my-sites');
                }
                fixed.push('XML ' + c.name + ' -> my-sites' + (dryRun ? ' (dry)' : ''));
            }
        } catch (e) {}
    }
    try {
        var kids = c.children;
        for (var i = 0; i < kids.length; i++) inspectNode(kids[i]);
    } catch (e) {}
}

if (components != null) {
    try {
        var kids = components.children;
        for (var i = 0; i < kids.length; i++) inspectNode(kids[i]);
    } catch (e) { debug.push('iter err: ' + e); }
}

// dump recursif des objets page
function dumpPages(n, depth) {
    try {
        if (n.isDocument && n.name.indexOf('dashboard') != -1) {
            var pxml = ('' + n.content).replace(/\s+/g, ' ').substring(0, 500);
            debug.push('PAGE ' + n.name + ': ' + pxml);
        }
        if (depth < 6) {
            var kids = n.children;
            for (var i = 0; i < kids.length; i++) dumpPages(kids[i], depth + 1);
        }
    } catch (e) {}
}
try {
    var pages = surfConfig.childByNamePath('pages');
    if (pages != null) dumpPages(pages, 0);
    else debug.push('pages folder not found');
} catch (e) { debug.push('pages err: ' + e); }

model.dryRun = dryRun;
model.scanned = scanned;
model.fixedCount = fixed.length;
model.fixed = fixed;
model.debug = debug;
