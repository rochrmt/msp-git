/**
 * Signature notifications for MSP-GED
 * Polls signature events and shows toast/bell notifications
 * Event types: ASSIGNMENT, SIGNED, REJECTED, COMPLETED
 * Read state is persisted server-side (sg:notificationRead)
 */
(function() {
    'use strict';

    console.log('[SG Share] v8 loaded - CSRF fix + deferred nav');

    var POLL_INTERVAL = 15000;
    var WEBSPI_URL = '/share/proxy/alfresco/msp-ged/signature-notifications';
    var READ_URL = '/share/proxy/alfresco/msp-ged/signature-notifications-read';
    var firstPoll = true;
    var shownNotifications = {};
    var notifications = [];
    var bellContainer = null;
    var bellBadge = null;
    var dropdown = null;

    function createBell() {
        if (document.getElementById('sg-share-bell')) return;

        bellContainer = document.createElement('div');
        bellContainer.id = 'sg-share-bell';
        bellContainer.style.cssText = 'position:fixed;top:10px;right:20px;z-index:999999;display:inline-block;cursor:pointer;background:#333;border-radius:50%;width:40px;height:40px;text-align:center;line-height:40px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
        bellContainer.innerHTML = '&#128276;';
        bellContainer.title = 'Notifications de signature';

        bellBadge = document.createElement('span');
        bellBadge.id = 'sg-share-badge';
        bellBadge.style.cssText = 'position:absolute;top:-2px;right:-2px;background:#ff4081;color:#fff;font-size:10px;font-weight:bold;border-radius:50%;width:18px;height:18px;display:none;align-items:center;justify-content:center;';
        bellBadge.textContent = '0';
        bellContainer.appendChild(bellBadge);

        dropdown = document.createElement('div');
        dropdown.id = 'sg-share-dropdown';
        dropdown.style.cssText = 'position:fixed;top:55px;right:20px;width:340px;max-height:400px;overflow-y:auto;background:#fff;border:1px solid #ccc;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.2);display:none;z-index:999999;font-family:Arial,sans-serif;font-size:12px;color:#333;';

        var header = document.createElement('div');
        header.style.cssText = 'padding:10px 12px;border-bottom:1px solid #eee;font-weight:bold;background:#f5f5f5;';
        header.innerHTML = 'Notifications de signature' +
            ' <a id="sg-mark-all" href="#" style="float:right;font-weight:normal;color:#2196F3;text-decoration:none;margin-right:14px;">Tout marquer lu</a>' +
            ' <span id="sg-bell-close" style="float:right;cursor:pointer;color:#999;">&times;</span>';
        dropdown.appendChild(header);

        var list = document.createElement('div');
        list.id = 'sg-share-list';
        dropdown.appendChild(list);

        document.body.appendChild(bellContainer);
        document.body.appendChild(dropdown);

        bellContainer.addEventListener('click', function(e) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            e.stopPropagation();
        });

        // The dropdown is a sibling of bellContainer (child of body): its clicks
        // must be handled on the dropdown itself.
        dropdown.addEventListener('click', function(e) {
            if (e.target.id === 'sg-bell-close') {
                dropdown.style.display = 'none';
                e.stopPropagation();
                return;
            }
            if (e.target.id === 'sg-mark-all') {
                e.preventDefault();
                e.stopPropagation();
                markAllRead();
                return;
            }
            // keep the dropdown open for other inner clicks
            e.stopPropagation();
        });

        document.addEventListener('click', function(e) {
            if (!bellContainer.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    function updateBadge(count) {
        if (!bellBadge) return;
        if (count > 0) {
            bellBadge.textContent = count > 9 ? '9+' : count;
            bellBadge.style.display = 'flex';
        } else {
            bellBadge.style.display = 'none';
        }
    }

    function getEventInfo(eventType) {
        switch(eventType) {
            case 'ASSIGNMENT': return { icon: '&#128203;', color: '#2196F3', title: 'Tâche assignée' };
            case 'SIGNED':     return { icon: '&#10004;',  color: '#4caf50', title: 'Document signé' };
            case 'REJECTED':   return { icon: '&#10008;',  color: '#f44336', title: 'Document rejeté' };
            case 'COMPLETED':  return { icon: '&#9733;',  color: '#9c27b0', title: 'Workflow terminé' };
            default:           return { icon: '&#8226;',  color: '#999',    title: 'Notification' };
        }
    }

    function renderDropdown() {
        var list = document.getElementById('sg-share-list');
        if (!list) return;
        list.innerHTML = '';

        if (notifications.length === 0) {
            list.innerHTML = '<div style="padding:15px;text-align:center;color:#888;">Aucune notification</div>';
            return;
        }

        notifications.forEach(function(n) {
            var info = getEventInfo(n.eventType);
            var item = document.createElement('div');
            var detail = '';

            if (n.eventType === 'ASSIGNMENT') {
                detail = 'Une tâche de signature vous est assignée';
            } else if (n.eventType === 'SIGNED') {
                detail = 'par ' + (n.signerName || '');
            } else if (n.eventType === 'REJECTED') {
                detail = 'rejeté par ' + (n.signerName || '');
            } else if (n.eventType === 'COMPLETED') {
                detail = 'Tous les signataires ont signé';
            }

            item.style.cssText = 'padding:10px 12px;border-bottom:1px solid #f0f0f0;cursor:pointer;';
            item.innerHTML = '<div style="display:flex;align-items:flex-start;gap:8px;">' +
                '<span style="font-size:16px;color:' + info.color + ';font-weight:bold;">' + info.icon + '</span>' +
                '<div style="flex:1;">' +
                '<div style="font-weight:bold;color:#333;">' + info.title + '</div>' +
                '<div style="color:#555;word-break:break-word;">' + escapeHtml(n.documentName) + '</div>' +
                '<div style="color:#888;font-size:10px;">' + escapeHtml(detail) + '</div>' +
                '</div></div>';

            item.addEventListener('click', function() {
                notifications = notifications.filter(function(x) { return x.nodeId !== n.nodeId; });
                updateBadge(notifications.length);
                if (dropdown) dropdown.style.display = 'none';
                var target;
                if (n.eventType === 'ASSIGNMENT' && n.taskId) {
                    target = '/share/page/task-edit?taskId=activiti$' + encodeURIComponent(n.taskId);
                } else if (n.documentNodeRef) {
                    target = '/share/page/document-details?nodeRef=' + encodeURIComponent(n.documentNodeRef);
                } else {
                    target = '/share/page/my-tasks#filter=workflows|active';
                }
                // wait for the mark-read POST before navigating
                markRead([n.nodeId], function() { window.location.href = target; });
            });

            list.appendChild(item);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Auto-mark notifications as read when the user is already consulting
    // the target page (task-edit for ASSIGNMENT, document-details otherwise)
    function checkConsulted(unreadList) {
        var href = window.location.href;
        var toMark = [];
        unreadList.forEach(function(n) {
            if (n.taskId && href.indexOf('task-') !== -1 &&
                (href.indexOf(encodeURIComponent(n.taskId)) !== -1 || href.indexOf(n.taskId) !== -1)) {
                toMark.push(n);
            } else if (n.documentNodeRef && href.indexOf('document-details') !== -1 &&
                (href.indexOf(encodeURIComponent(n.documentNodeRef)) !== -1 || href.indexOf(n.documentNodeRef) !== -1)) {
                toMark.push(n);
            }
        });
        if (toMark.length === 0) return unreadList;

        var marked = {};
        var ids = [];
        toMark.forEach(function(n) { marked[n.nodeId] = true; ids.push(n.nodeId); });
        markRead(ids);
        return unreadList.filter(function(n) { return !marked[n.nodeId]; });
    }

    // Share's CSRF filter rejects proxy POSTs without this header
    function getCsrfToken() {
        var m = document.cookie.match(/Alfresco-CSRFToken=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    }

    // Persist read state on the repo; calls done() once the POST finished
    // (or after a short timeout) so navigation doesn't abort the request
    function markRead(nodeIds, done) {
        if (!nodeIds || nodeIds.length === 0) { if (done) done(); return; }
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', READ_URL + '?ids=' + encodeURIComponent(nodeIds.join(',')), true);
            xhr.withCredentials = true;
            xhr.setRequestHeader('Alfresco-CSRFToken', getCsrfToken());
            if (done) {
                var finished = false;
                var finish = function() { if (!finished) { finished = true; done(); } };
                xhr.onreadystatechange = function() { if (xhr.readyState === 4) finish(); };
                setTimeout(finish, 1500);
            }
            xhr.send();
        } catch (e) { if (done) done(); }
    }

    function markAllRead() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', READ_URL + '?all=true', true);
            xhr.withCredentials = true;
            xhr.setRequestHeader('Alfresco-CSRFToken', getCsrfToken());
            xhr.send();
        } catch (e) { /* silent */ }
        notifications = [];
        updateBadge(0);
        renderDropdown();
    }

    function fetchNotifications() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', WEBSPI_URL, true);
        xhr.withCredentials = true;
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) return;
            if (xhr.status !== 200) return;
            try {
                var data = JSON.parse(xhr.responseText);
                if (!data.notifications) return;

                // Only unread notifications are kept in the list
                var unread = data.notifications.filter(function(n) { return !n.read; });
                // Drop notifications whose target page is currently being viewed
                unread = checkConsulted(unread);

                // Detect brand-new unread notifications for toasts
                var newOnes = [];
                if (!firstPoll) {
                    unread.forEach(function(n) {
                        var key = n.nodeId + '_' + n.notificationDate;
                        if (!shownNotifications[key]) {
                            newOnes.push(n);
                        }
                    });
                }
                unread.forEach(function(n) {
                    shownNotifications[n.nodeId + '_' + n.notificationDate] = true;
                });

                notifications = unread;
                updateBadge(notifications.length);
                renderDropdown();

                newOnes.forEach(function(n) {
                    showToast(n);
                });

                firstPoll = false;
            } catch (e) {
                // silent
            }
        };
        xhr.send();
    }

    function showToast(n) {
        var info = getEventInfo(n.eventType);
        var msg = '';
        if (n.eventType === 'ASSIGNMENT') {
            msg = 'Tâche de signature assignée: ' + n.documentName;
        } else if (n.eventType === 'SIGNED') {
            msg = n.documentName + ' a été signé par ' + (n.signerName || '');
        } else if (n.eventType === 'REJECTED') {
            msg = n.documentName + ' a été rejeté par ' + (n.signerName || '');
        } else if (n.eventType === 'COMPLETED') {
            msg = 'Workflow terminé: ' + n.documentName;
        }

        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:10px;right:70px;z-index:1000000;background:#fff;border-left:4px solid ' + info.color + ';border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.2);padding:12px 16px;width:320px;cursor:pointer;font-family:Arial,sans-serif;font-size:13px;';
        toast.innerHTML = '<strong style="color:' + info.color + ';">' + info.icon + ' ' + info.title + '</strong><br>' + escapeHtml(msg);

        toast.addEventListener('click', function() {
            var target;
            if (n.eventType === 'ASSIGNMENT' && n.taskId) {
                target = '/share/page/task-edit?taskId=activiti$' + encodeURIComponent(n.taskId);
            } else if (n.documentNodeRef) {
                target = '/share/page/document-details?nodeRef=' + encodeURIComponent(n.documentNodeRef);
            } else {
                target = '/share/page/my-tasks#filter=workflows|active';
            }
            toast.remove();
            markRead([n.nodeId], function() { window.location.href = target; });
        });

        document.body.appendChild(toast);
        setTimeout(function() {
            if (toast.parentElement) toast.remove();
        }, 12000);
    }

    function init() {
        createBell();
        renderDropdown();
        fetchNotifications();
        setInterval(fetchNotifications, POLL_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* === MSP-GED : accès direct au workflow de signature ===
   - Renomme "Démarrer un workflow" -> "Initier des signatures" partout
     (dashlet, toolbars, titre de page, action document)
   - Sur /page/start-workflow : sélectionne automatiquement l'unique
     workflow visible (Signature de document TDR) -> formulaire direct */
(function() {
    'use strict';

    var SG_LABEL = 'Initier des signatures';
    var RELABEL_MAP = [
        ['D\u00e9marrer un workflow', SG_LABEL],
        ['Mes workflows', 'Mes signatures'],
        ['My Workflows', 'Mes signatures'],
        ['Afficher le workflow', 'Afficher la signature']
    ];

    function relabelTextNodes(root) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var nodes = [];
        var n;
        while ((n = walker.nextNode())) {
            if (n.nodeValue) nodes.push(n);
        }
        nodes.forEach(function(t) {
            RELABEL_MAP.forEach(function(pair) {
                if (t.nodeValue.indexOf(pair[0]) !== -1) {
                    t.nodeValue = t.nodeValue.split(pair[0]).join(pair[1]);
                }
            });
        });
    }

    function onPage() {
        relabelTextNodes(document.body);
        RELABEL_MAP.forEach(function(pair) {
            if (document.title.indexOf(pair[0]) !== -1) {
                document.title = document.title.split(pair[0]).join(pair[1]);
            }
        });
    }

    // Contenu dynamique (actions doclib, menus YUI) : observer les ajouts
    var observer = new MutationObserver(function(muts) {
        muts.forEach(function(m) {
            for (var i = 0; i < m.addedNodes.length; i++) {
                var nd = m.addedNodes[i];
                if (nd.nodeType === 1) relabelTextNodes(nd);
                else if (nd.nodeType === 3 && nd.nodeValue) {
                    RELABEL_MAP.forEach(function(pair) {
                        if (nd.nodeValue.indexOf(pair[0]) !== -1) {
                            nd.nodeValue = nd.nodeValue.split(pair[0]).join(pair[1]);
                        }
                    });
                }
            }
        });
    });

    // Sélection automatique sur /page/start-workflow quand un seul workflow
    // est visible (les autres sont masqués par share-config). Deux mécanismes :
    // 1) patch du prototype si on attrape la classe avant onReady
    // 2) sinon, récupération de l'instance déjà initialisée via ComponentManager
    //    et déclenchement direct de la sélection
    function patchStartWorkflow() {
        if (!/page\/start-workflow/.test(location.pathname)) return;
        var done = false;
        var tries = 0;

        function selectSingle(comp) {
            if (done) return;
            var defs = comp.options.workflowDefinitions || [];
            if (defs.length === 1) {
                done = true;
                comp.onWorkflowSelectChange('click', [null, { index: 0 }]);
            }
        }

        var timer = setInterval(function() {
            if (done || ++tries > 200) { clearInterval(timer); return; }

            var C = window.Alfresco && Alfresco.component && Alfresco.component.StartWorkflow;
            if (C && !C.prototype._sgAutoPatched) {
                C.prototype._sgAutoPatched = true;
                var orig = C.prototype.onReady;
                C.prototype.onReady = function() {
                    orig.call(this);
                    selectSingle(this);
                };
            }

            // Instance déjà créée et initialisée ? Déclencher directement.
            var btn = document.querySelector('[id$="-workflow-definition-button"]');
            if (btn) {
                var htmlId = btn.id.replace(/-workflow-definition-button.*$/, '');
                var comp = Alfresco.util && Alfresco.util.ComponentManager &&
                    Alfresco.util.ComponentManager.get(htmlId);
                if (comp && comp.widgets && comp.widgets.workflowDefinitionMenuButton) {
                    selectSingle(comp);
                    if (done) clearInterval(timer);
                }
            }
        }, 50);
    }

    /* ---- Pages listes tâches/signatures : nettoyage + badges cartes ---- */
    var MONTHS_FR = {
        janvier: 0, 'f\u00e9vrier': 1, mars: 2, avril: 3, mai: 4, juin: 5,
        juillet: 6, 'ao\u00fbt': 7, septembre: 8, octobre: 9, novembre: 10,
        'd\u00e9cembre': 11
    };

    function isListPage() {
        return /page\/(my-tasks|my-workflows)/.test(location.pathname);
    }

    function parseFrDate(text) {
        var m = /(\d{1,2})\s+([^\s,]+)\s*,?\s*(\d{4})/.exec((text || '').trim());
        if (!m) return null;
        var mon = MONTHS_FR[m[2].toLowerCase()];
        if (mon == null) return null;
        return new Date(+m[3], mon, +m[1]);
    }

    function decorateCards() {
        if (!isListPage()) return;

        // Supprime le tbody message + toute ligne "Chargement..." restée
        document.querySelectorAll('tbody.yui-dt-message').forEach(function(tb) {
            tb.style.display = 'none';
        });
        document.querySelectorAll('.yui-dt-loading').forEach(function(el) {
            var tr = el.closest ? el.closest('tr') : null;
            if (tr) tr.style.display = 'none';
            else el.style.display = 'none';
        });
        // Filet de sécurité : masquer par contenu texte (Chargement.../Loading...)
        document.querySelectorAll('.yui-dt td .yui-dt-liner, .yui-dt td').forEach(function(el) {
            var t = (el.textContent || '').trim();
            if (/^(chargement|loading)/i.test(t)) {
                var tr = el.closest ? el.closest('tr') : null;
                if (tr) tr.style.display = 'none';
            }
        });

        document.querySelectorAll('.yui-dt tbody.yui-dt-data > tr').forEach(function(tr) {
            if (tr.classList.contains('sg-card-done')) return;
            tr.classList.add('sg-card-done');

            var started = tr.querySelector('div.started span');
            if (!started) return;

            // Ligne de date compacte dans la carte
            started.parentNode.classList.add('sg-date-line');

            // Badge "Récent" si la date d'initiation a moins de 7 jours
            var d = parseFrDate(started.textContent);
            if (!d) return;
            tr.dataset.sgDate = d.getTime();
            var age = (Date.now() - d.getTime()) / 864e5;
            if (age >= 0 && age <= 7) {
                tr.classList.add('sg-recent');
                var liner = tr.querySelector('.yui-dt-liner');
                if (liner && !liner.querySelector('.sg-badge-recent')) {
                    var b = document.createElement('span');
                    b.className = 'sg-badge-recent';
                    b.textContent = 'R\u00e9cent';
                    liner.appendChild(b);
                }
            }
        });

        // Tri des cartes : plus récentes en premier (date d'initiation décroissante)
        document.querySelectorAll('.tasks.yui-dt tbody.yui-dt-data, .workflows.yui-dt tbody.yui-dt-data').forEach(function(tb) {
            var rows = [].slice.call(tb.querySelectorAll(':scope > tr'));
            if (rows.length < 2) return;
            var sorted = rows.slice().sort(function(a, b) {
                return (+b.dataset.sgDate || 0) - (+a.dataset.sgDate || 0);
            });
            var changed = sorted.some(function(r, i) { return r !== rows[i]; });
            if (changed) sorted.forEach(function(r) { tb.appendChild(r); });
        });
    }

    function start() {
        onPage();
        patchStartWorkflow();
        decorateCards();
        setInterval(decorateCards, 1500);
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
