(function() {
    'use strict';

    var SUMMARY_URL = '/share/proxy/alfresco/msp-ged/dashboard-summary';
    var attempts = 0;

    function isUserDashboard() {
        var path = window.location.pathname;
        return /\/share\/page\/user\/[^/]+\/dashboard\/?$/.test(path) || path.indexOf('/share/page/user-dashboard') !== -1;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function icon(name) {
        var icons = {
            active: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h8a2 2 0 0 1 2 2v2h1a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2h1V4a2 2 0 0 1 2-2Zm0 4h8V4H8v2Zm-3 6h14V8H5v4Zm0 2v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5h-5v1a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-1H5Z"/></svg>',
            completed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm4.7 6.3a1 1 0 0 0-1.4 0L10.5 13 8.7 11.3a1 1 0 1 0-1.4 1.4l2.5 2.5a1 1 0 0 0 1.4 0l5.5-5.5a1 1 0 0 0 0-1.4Z"/></svg>',
            shared: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM8 5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm8 8c3.3 0 6 1.8 6 4v2a2 2 0 0 1-2 2h-7.1c.7-.8 1.1-1.8 1.1-3v-1c0-1.3-.6-2.4-1.6-3.3 1-.5 2.2-.7 3.6-.7ZM8 14c3.3 0 6 1.8 6 4v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1c0-2.2 2.7-4 6-4Z"/></svg>',
            upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a1 1 0 0 1 .7.3l4 4a1 1 0 0 1-1.4 1.4L13 5.4V15a1 1 0 1 1-2 0V5.4L8.7 7.7a1 1 0 0 1-1.4-1.4l4-4A1 1 0 0 1 12 2ZM5 13a1 1 0 0 1 1 1v5h12v-5a1 1 0 1 1 2 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5a1 1 0 0 1 1-1Z"/></svg>',
            file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm6 2H6v16h10V8h-4V4Zm1.4.8V7h2.2l-2.2-2.2Z"/></svg>',
            arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4l4.3-4.3H4a1 1 0 1 1 0-2h13.6l-4.3-4.3a1 1 0 0 1 0-1.4Z"/></svg>',
            refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4a1 1 0 0 1 1 1v5h-5a1 1 0 1 1 0-2h2.1A7 7 0 1 0 19 14a1 1 0 1 1 2 .3A9 9 0 1 1 18.7 6L19 5a1 1 0 0 1 1-1Z"/></svg>'
        };
        return icons[name] || icons.file;
    }

    function pageUrl(path) {
        return '/share/page/' + path;
    }

    function statCard(key, iconName, label, detail, href, tone) {
        return '<a class="msp-stat-card msp-stat-' + tone + '" href="' + href + '" data-stat="' + key + '">' +
            '<span class="msp-stat-icon">' + icon(iconName) + '</span>' +
            '<span class="msp-stat-copy"><span class="msp-stat-value msp-skeleton-text">0</span><span class="msp-stat-label">' + label + '</span><span class="msp-stat-detail">' + detail + '</span></span>' +
            '<span class="msp-stat-arrow">' + icon('arrow') + '</span>' +
            '</a>';
    }

    function todayLabel() {
        try {
            return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {
            return new Date().toLocaleDateString();
        }
    }

    function buildOverview() {
        var username = window.Alfresco && Alfresco.constants ? Alfresco.constants.USERNAME : '';
        var overview = document.createElement('section');
        overview.id = 'msp-dashboard-overview';
        overview.innerHTML =
            '<div class="msp-dashboard-welcome">' +
                '<div class="msp-welcome-copy"><span class="msp-eyebrow">Espace personnel</span><h1>Bonjour, <span id="msp-dashboard-name">' + escapeHtml(username) + '</span></h1><p>Retrouvez en un coup d’œil vos tâches, vos espaces et vos documents.</p><span class="msp-today">' + escapeHtml(todayLabel()) + '</span></div>' +
                '<div class="msp-quick-actions"><a class="msp-action-primary" href="' + pageUrl('start-workflow') + '">Initier des signatures</a><a class="msp-action-secondary" href="' + pageUrl('context/mine/myfiles') + '">Accéder à mes fichiers</a><a class="msp-action-secondary" href="/share/proxy/alfresco/msp-ged/signature-registry" target="_blank">Registre des signatures</a></div>' +
            '</div>' +
            '<div class="msp-stat-grid">' +
                statCard('activeTasks', 'active', 'Tâches en cours', 'À traiter maintenant', pageUrl('my-tasks#filter=workflows|active'), 'blue') +
                statCard('completedTasks', 'completed', 'Tâches exécutées', 'Historique terminé', pageUrl('my-tasks#filter=workflows|completed'), 'green') +
                statCard('sharedDocuments', 'shared', 'Documents partagés', 'Accessibles par votre équipe', pageUrl('context/shared/sharedfiles'), 'violet') +
                statCard('recentUploads', 'upload', 'Ajouts récents', 'Sur les 30 derniers jours', pageUrl('context/mine/myfiles'), 'orange') +
            '</div>' +
            '<div class="msp-recent-panel">' +
                '<div class="msp-panel-heading"><div><span class="msp-panel-kicker">Documents</span><h2>Ajouts récents</h2><p>Vos derniers contenus déposés dans MSP-GED</p></div><div class="msp-panel-actions"><button id="msp-dashboard-refresh" type="button" title="Actualiser les indicateurs">' + icon('refresh') + '<span>Actualiser</span></button><a href="' + pageUrl('context/mine/myfiles') + '">Voir tous mes fichiers ' + icon('arrow') + '</a></div></div>' +
                '<div id="msp-recent-documents" class="msp-recent-list" aria-live="polite"><div class="msp-recent-loading"><span></span><span></span><span></span></div></div>' +
            '</div>';
        return overview;
    }

    function closestColumn(element) {
        var node = element;
        while (node && node !== document.body) {
            if ((' ' + node.className + ' ').indexOf(' yui-u ') !== -1) return node;
            node = node.parentNode;
        }
        return null;
    }

    function prepareLayout(grid) {
        var tasks = grid.querySelector('.dashlet.my-tasks');
        var sites = grid.querySelector('.dashlet.my-sites');
        if (tasks) {
            var taskColumn = closestColumn(tasks);
            if (taskColumn) taskColumn.className += ' msp-task-column';
            var taskTitle = tasks.querySelector('.title');
            if (taskTitle) taskTitle.textContent = 'Mes tâches';
        }
        if (sites) {
            var siteColumn = closestColumn(sites);
            if (siteColumn) siteColumn.className += ' msp-sites-column';
            var siteTitle = sites.querySelector('.title');
            if (siteTitle) siteTitle.textContent = 'Mes sites';
        }
        grid.className += ' msp-dashboard-grid';
    }

    function setCount(key, value) {
        var card = document.querySelector('[data-stat="' + key + '"]');
        if (!card) return;
        var count = card.querySelector('.msp-stat-value');
        count.className = 'msp-stat-value';
        count.textContent = String(value == null ? 0 : value);
    }

    function appendSitesBadge(value) {
        var title = document.querySelector('.dashlet.my-sites > .title');
        if (!title) return;
        var badge = title.querySelector('.msp-title-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'msp-title-badge';
            title.appendChild(badge);
        }
        badge.textContent = String(value == null ? 0 : value);
    }

    function formatFileSize(bytes) {
        var value = Number(bytes) || 0;
        if (value < 1024) return value + ' o';
        if (value < 1048576) return Math.round(value / 1024) + ' Ko';
        if (value < 1073741824) return (value / 1048576).toFixed(value < 10485760 ? 1 : 0) + ' Mo';
        return (value / 1073741824).toFixed(1) + ' Go';
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'Date non disponible';
        try {
            return new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            return new Date(timestamp).toLocaleDateString();
        }
    }

    function fileTypeClass(mimetype) {
        var type = String(mimetype || '').toLowerCase();
        if (type.indexOf('pdf') !== -1) return 'pdf';
        if (type.indexOf('word') !== -1 || type.indexOf('document') !== -1) return 'word';
        if (type.indexOf('sheet') !== -1 || type.indexOf('excel') !== -1) return 'sheet';
        if (type.indexOf('image') !== -1) return 'image';
        return 'generic';
    }

    function renderRecent(documents) {
        var container = document.getElementById('msp-recent-documents');
        if (!container) return;
        if (!documents || !documents.length) {
            container.innerHTML = '<div class="msp-recent-empty"><span class="msp-empty-icon">' + icon('file') + '</span><div><strong>Aucun document récent</strong><p>Vos prochains dépôts apparaîtront automatiquement ici.</p></div><a href="' + pageUrl('context/mine/myfiles') + '">Accéder à mes fichiers</a></div>';
            return;
        }
        var html = '';
        for (var i = 0; i < documents.length; i++) {
            var documentData = documents[i];
            var href = pageUrl('document-details?nodeRef=' + encodeURIComponent(documentData.nodeRef));
            html += '<a class="msp-recent-document" href="' + href + '">' +
                '<span class="msp-file-icon msp-file-' + fileTypeClass(documentData.mimetype) + '">' + icon('file') + '</span>' +
                '<span class="msp-file-info"><strong>' + escapeHtml(documentData.name) + '</strong><small>' + escapeHtml(documentData.location) + '</small></span>' +
                '<span class="msp-file-date"><strong>' + formatDate(documentData.createdAt) + '</strong><small>' + formatFileSize(documentData.size) + '</small></span>' +
                '<span class="msp-file-arrow">' + icon('arrow') + '</span>' +
                '</a>';
        }
        container.innerHTML = html;
    }

    function renderSummary(data) {
        var user = data.user || {};
        var displayName = user.firstName || user.lastName ? (user.firstName + ' ' + user.lastName).replace(/^\s+|\s+$/g, '') : user.userName;
        var name = document.getElementById('msp-dashboard-name');
        if (name && displayName) name.textContent = displayName;
        var counts = data.counts || {};
        setCount('activeTasks', counts.activeTasks);
        setCount('completedTasks', counts.completedTasks);
        setCount('sharedDocuments', counts.sharedDocuments);
        setCount('recentUploads', counts.recentUploads);
        appendSitesBadge(counts.sites);
        renderRecent(data.recentDocuments || []);
    }

    function renderUnavailable() {
        var values = document.querySelectorAll('.msp-stat-value');
        for (var i = 0; i < values.length; i++) {
            values[i].className = 'msp-stat-value';
            values[i].textContent = '—';
        }
        var container = document.getElementById('msp-recent-documents');
        if (container) container.innerHTML = '<div class="msp-recent-error">Les indicateurs sont momentanément indisponibles. Les sections Mes tâches et Mes sites restent accessibles ci-dessous.</div>';
    }

    function cacheKey() {
        var username = window.Alfresco && Alfresco.constants ? Alfresco.constants.USERNAME : 'user';
        return 'msp-dashboard-summary:' + username;
    }

    function readCachedSummary() {
        try {
            var cached = JSON.parse(window.sessionStorage.getItem(cacheKey()));
            if (cached && cached.savedAt && new Date().getTime() - cached.savedAt < 60000) return cached.data;
        } catch (e) {}
        return null;
    }

    function saveCachedSummary(data) {
        try {
            window.sessionStorage.setItem(cacheKey(), JSON.stringify({ savedAt: new Date().getTime(), data: data }));
        } catch (e) {}
    }

    function loadSummary(forceRefresh) {
        if (!forceRefresh) {
            var cached = readCachedSummary();
            if (cached) {
                renderSummary(cached);
                return;
            }
        }
        var refresh = document.getElementById('msp-dashboard-refresh');
        if (refresh) refresh.className = 'is-loading';
        var xhr = new XMLHttpRequest();
        xhr.open('GET', SUMMARY_URL + '?t=' + new Date().getTime(), true);
        xhr.withCredentials = true;
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) return;
            if (refresh) refresh.className = '';
            if (xhr.status !== 200) {
                renderUnavailable();
                return;
            }
            try {
                var data = JSON.parse(xhr.responseText);
                saveCachedSummary(data);
                renderSummary(data);
            } catch (e) {
                renderUnavailable();
            }
        };
        xhr.send();
    }

    function taskNumber(id) {
        return parseInt(String(id || '').split('$').pop(), 10) || 0;
    }

    // Tri "plus récentes en haut" : les ids activiti$N sont séquentiels
    function hookMyTasks(attempt) {
        var found = [];
        try {
            found = Alfresco.util.ComponentManager.find({ name: 'Alfresco.dashlet.MyTasks' });
        } catch (e) {}
        if (!found.length) {
            if (attempt < 60) window.setTimeout(function() { hookMyTasks(attempt + 1); }, 250);
            return;
        }
        var myTasks = found[0];
        var wrapper = myTasks.widgets && myTasks.widgets.alfrescoDataTable;
        var table = wrapper && wrapper.getDataTable ? wrapper.getDataTable() : null;
        if (!table || table.__mspDone) {
            if (!table && attempt < 60) window.setTimeout(function() { hookMyTasks(attempt + 1); }, 250);
            return;
        }
        table.__mspDone = true;

        var original = table.doBeforeLoadData;
        table.doBeforeLoadData = function(sRequest, oResponse, oPayload) {
            if (oResponse && oResponse.results && oResponse.results.length > 1) {
                oResponse.results.sort(function(a, b) { return taskNumber(b.id) - taskNumber(a.id); });
            }
            return original.apply(this, arguments);
        };

        // Décoration des lignes : barre de priorité + badge de date relative
        var decorate = function() {
            var recordSet = table.getRecordSet();
            var records = recordSet ? recordSet.getRecords() : [];
            for (var i = 0; i < records.length; i++) {
                var tr = table.getTrEl(records[i]);
                if (!tr) continue;
                var data = records[i].getData();
                tr.className = tr.className.replace(/ msp-prio-\w+/g, '');
                var priority = data.properties ? data.properties['bpm_priority'] : '';
                tr.className += ' msp-prio-' + (priority == 1 ? 'high' : priority == 3 ? 'low' : 'medium');
            }
        };
        if (table.subscribe) table.subscribe('renderEvent', decorate);
        decorate();

        // Si des lignes déjà affichées avant le patch : recharger trié
        if (table.getRecordSet() && table.getRecordSet().getLength() > 0) {
            try {
                var filter = myTasks.widgets.filterMenuButton ? myTasks.widgets.filterMenuButton.value : 'activeTasks';
                wrapper.loadDataTable(myTasks.substituteParameters(myTasks.options.filters[filter], {}));
            } catch (e) {}
        }
    }

    function initialize() {
        if (!isUserDashboard() || document.getElementById('msp-dashboard-overview')) return;
        var grid = document.querySelector('#bd > .grid, #bd .grid');
        if (!grid) {
            if (attempts++ < 40) window.setTimeout(initialize, 250);
            return;
        }
        document.body.className += ' msp-modern-dashboard';
        prepareLayout(grid);
        grid.parentNode.insertBefore(buildOverview(), grid);
        var refresh = document.getElementById('msp-dashboard-refresh');
        if (refresh) refresh.addEventListener('click', function() { loadSummary(true); });
        loadSummary(false);
        hookMyTasks(0);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
    else initialize();
}());
