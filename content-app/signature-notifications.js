/**
 * Signature Notification Bell for ACA
 * Intercepts Authorization headers and shows a bell with badge
 */
(function() {
    'use strict';

    var POLL_INTERVAL = 30000;
    var WEBSPI_URL = '/alfresco/s/msp-ged/signature-notifications';
    var READ_URL = '/alfresco/s/msp-ged/signature-notifications-read';
    var authHeader = null;
    var lastTimestamp = 0;
    var shownNotifications = {};
    var notifications = [];
    var bellContainer = null;
    var bellBadge = null;
    var dropdown = null;

    // --- Auth interception ---
    function captureAuth(args) {
        if (authHeader) return;
        if (args && args.length > 1) {
            var opts = args[1];
            if (opts && opts.headers) {
                var h = opts.headers;
                if (h.Authorization || h.get && h.get('Authorization')) {
                    authHeader = h.Authorization || h.get('Authorization');
                }
            }
        }
    }

    var origFetch = window.fetch;
    window.fetch = function() {
        captureAuth(arguments);
        return interceptShare(arguments, origFetch, this);
    };

    // Intercept QuickShare: copy to Shared folder instead of creating public links
    function interceptShare(args, nativeFetch, ctx) {
        var url = args.length > 0 ? args[0] : '';
        var opts = args.length > 1 ? args[1] : {};
        var method = (opts.method || 'GET').toUpperCase();

        // GET shared-links: replace with Shared folder contents (visible to ALL users)
        if (typeof url === 'string' && method === 'GET' && url.indexOf('/shared-links') !== -1 && url.indexOf('/alfresco/api/') !== -1) {
            var sharedUrl = '/alfresco/api/-default-/public/alfresco/versions/1/nodes/-shared-/children';
            // preserve query params (maxItems, skipCount, etc.)
            var qIdx = url.indexOf('?');
            if (qIdx !== -1) sharedUrl += url.substring(qIdx);
            console.log('[SG Share] Intercepting shared-links LIST -> ' + sharedUrl);
            return nativeFetch.call(ctx, sharedUrl, {
                method: 'GET',
                headers: opts.headers || {},
                credentials: 'include'
            }).then(function(resp) {
                return resp.text().then(function(text) {
                    // Transform node children entries to look like shared-links entries
                    try {
                        var data = JSON.parse(text);
                        if (data.list && data.list.entries) {
                            data.list.entries = data.list.entries.map(function(e) {
                                var node = e.entry;
                                return {
                                    entry: {
                                        id: node.id,
                                        nodeId: node.id,
                                        name: node.name,
                                        modifiedAt: node.modifiedAt,
                                        modifiedByUser: node.modifiedByUser,
                                        createdAt: node.createdAt,
                                        createdByUser: node.createdByUser,
                                        aspectNames: node.aspectNames,
                                        nodeType: node.nodeType,
                                        content: node.content,
                                        sharedByUser: node.createdByUser || { id: 'system' },
                                        expiresAt: null,
                                        entry: node
                                    }
                                };
                            });
                        }
                        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
                    } catch (e) {
                        return new Response(text, { status: resp.status, headers: { 'Content-Type': 'application/json' } });
                    }
                });
            });
        }

        // POST shared-links or nodes/{id}/shares: copy to Shared folder instead
        var nodeId = null;
        if (typeof url === 'string' && method === 'POST') {
            var m1 = url.match(/\/alfresco\/api\/[^/]+\/[^/]+\/[^/]+\/versions\/\d+\/nodes\/([^/]+)\/shares(?:\?|$)/);
            var m2 = url.match(/\/alfresco\/api\/[^/]+\/[^/]+\/[^/]+\/versions\/\d+\/shared-links(?:\?|$)/);
            if (m1) {
                nodeId = m1[1];
            } else if (m2) {
                try {
                    var bodyObj = JSON.parse(opts.body || '{}');
                    nodeId = bodyObj.nodeId || null;
                } catch (e) { /* ignore */ }
            }
        }
        if (!nodeId) {
            return nativeFetch.apply(ctx, args);
        }

        console.log('[SG Share] Intercepting QuickShare for node ' + nodeId + ' -> copy to Shared');
        var copyUrl = '/alfresco/api/-default-/public/alfresco/versions/1/nodes/' + nodeId + '/copy';
        var copyHeaders = opts.headers || {};
        return nativeFetch.call(ctx, copyUrl, {
            method: 'POST',
            headers: copyHeaders,
            credentials: 'include',
            body: JSON.stringify({ targetParentId: '-shared-' })
        }).then(function(resp) {
            if (resp.ok) {
                console.log('[SG Share] Copied to Shared OK');
                replaceShareDialog(true);
                return new Response(JSON.stringify({
                    entry: { id: 'shared-' + nodeId, nodeId: nodeId, sharedByUser: { id: 'me' }, expiresAt: null, linkedUrl: '/#/preview/s/' + nodeId }
                }), { status: 201, headers: { 'Content-Type': 'application/json' } });
            } else {
                console.log('[SG Share] Copy failed: ' + resp.status);
                replaceShareDialog(false);
                return resp;
            }
        }).catch(function(err) {
            console.log('[SG Share] Copy error: ' + err.message);
            replaceShareDialog(false, err.message);
            return nativeFetch.apply(ctx, args);
        });
    }

    // Replace the QuickShare dialog content with a simple confirmation
    function replaceShareDialog(success, errMsg) {
        setTimeout(function() {
            var pane = document.querySelector('.cdk-overlay-pane .mat-mdc-dialog-container, .cdk-overlay-pane [role="dialog"], .mat-mdc-dialog-container');
            if (!pane) {
                showShareToast(success ? 'Fichier copié dans « Fichiers partagés »' : 'Échec de la copie', success);
                return;
            }
            var icon = success ? '&#10004;' : '&#10008;';
            var color = success ? '#2e7d32' : '#d32f2f';
            var title = success ? 'Fichier partagé' : 'Échec du partage';
            var body = success
                ? 'Le fichier a été copié dans le dossier <b>« Fichiers partagés »</b>.<br>Il est maintenant visible par tous les utilisateurs.'
                : 'La copie vers « Fichiers partagés » a échoué.' + (errMsg ? '<br><small>' + escapeHtml(errMsg) + '</small>' : '');

            pane.innerHTML =
                '<div style="padding:30px;text-align:center;font-family:Arial,sans-serif;min-width:320px;">' +
                '<div style="font-size:48px;color:' + color + ';margin-bottom:12px;">' + icon + '</div>' +
                '<div style="font-size:18px;font-weight:bold;color:#333;margin-bottom:10px;">' + title + '</div>' +
                '<div style="font-size:13px;color:#555;margin-bottom:20px;">' + body + '</div>' +
                '<button id="sg-share-close" style="background:#2196F3;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:14px;">Fermer</button>' +
                '</div>';

            var btn = pane.querySelector('#sg-share-close');
            if (btn) {
                btn.addEventListener('click', function() {
                    var closeBtn = pane.querySelector('.mat-mdc-dialog-close, [mat-dialog-close], .adf-close-button');
                    if (closeBtn) { closeBtn.click(); }
                    else {
                        var overlay = pane.closest('.cdk-overlay-pane');
                        if (overlay) overlay.remove();
                        var backdrop = document.querySelector('.cdk-overlay-backdrop');
                        if (backdrop) backdrop.remove();
                    }
                });
            }
        }, 400);
    }

    function showShareToast(msg, success) {
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:' + (success ? '#2e7d32' : '#d32f2f') + ';color:#fff;padding:12px 20px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-family:Arial,sans-serif;font-size:14px;font-weight:bold;';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function() { if (t.parentElement) t.remove(); }, 4000);
    }

    var origXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        var xhr = new origXHR();
        var origSetHeader = xhr.setRequestHeader;
        xhr.setRequestHeader = function(name, value) {
            if (name === 'Authorization' && value) {
                authHeader = value;
            }
            return origSetHeader.call(xhr, name, value);
        };
        return xhr;
    };

    // --- Bell UI ---
    function createBell() {
        // Find a good place in the header
        var header = document.querySelector('app-header, [data-automation-id="app-header"], .app-header, header');
        if (!header) header = document.body;

        bellContainer = document.createElement('div');
        bellContainer.id = 'sg-bell-container';
        bellContainer.style.cssText = 'position:relative;display:inline-flex;align-items:center;justify-content:center;margin:0 12px;cursor:pointer;';

        // Bell icon (SVG)
        bellContainer.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#5f6368;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>';

        // Badge
        bellBadge = document.createElement('span');
        bellBadge.style.cssText = 'position:absolute;top:-2px;right:-4px;background:#d32f2f;color:#fff;font-size:10px;font-weight:bold;border-radius:50%;width:16px;height:16px;display:none;align-items:center;justify-content:center;';
        bellBadge.textContent = '0';
        bellContainer.appendChild(bellBadge);

        // Dropdown
        dropdown = document.createElement('div');
        dropdown.id = 'sg-bell-dropdown';
        dropdown.style.cssText = 'position:absolute;top:40px;right:-10px;width:360px;max-height:400px;overflow-y:auto;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:none;z-index:99999;font-family:Arial,sans-serif;font-size:13px;';

        // Header of dropdown
        var dropdownHeader = document.createElement('div');
        dropdownHeader.style.cssText = 'padding:12px 16px;border-bottom:1px solid #eee;font-weight:bold;font-size:14px;display:flex;justify-content:space-between;align-items:center;';
        dropdownHeader.innerHTML = '<span>Notifications de signature</span><span><a id="sg-mark-all" href="#" style="font-weight:normal;font-size:12px;color:#2196F3;text-decoration:none;margin-right:12px;">Tout marquer lu</a><span style="color:#999;cursor:pointer;font-size:16px;" id="sg-bell-close">×</span></span>';
        dropdown.appendChild(dropdownHeader);

        // List
        var list = document.createElement('div');
        list.id = 'sg-bell-list';
        dropdown.appendChild(list);

        bellContainer.appendChild(dropdown);

        // Insert into header
        if (header && header.tagName !== 'BODY') {
            header.appendChild(bellContainer);
        } else {
            // Fallback: fixed top right
            bellContainer.style.position = 'fixed';
            bellContainer.style.top = '14px';
            bellContainer.style.right = '80px';
            bellContainer.style.zIndex = '99999';
            document.body.appendChild(bellContainer);
        }

        // Events
        bellContainer.addEventListener('click', function(e) {
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
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            e.stopPropagation();
        });

        document.addEventListener('click', function(e) {
            if (dropdown && !bellContainer.contains(e.target)) {
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
            case 'ASSIGNMENT': return { icon: '\ud83d\udccb', color: '#2196F3', title: 'T\u00e2che assign\u00e9e' };
            case 'SIGNED':     return { icon: '\u2714', color: '#2e7d32', title: 'Document sign\u00e9' };
            case 'REJECTED':   return { icon: '\u2718', color: '#d32f2f', title: 'Document rejet\u00e9' };
            case 'COMPLETED':  return { icon: '\u2605', color: '#9c27b0', title: 'Workflow termin\u00e9' };
            default:           return { icon: '\u2022', color: '#999',    title: 'Notification' };
        }
    }

    function notifDetail(n) {
        if (n.eventType === 'ASSIGNMENT') return 'Une t\u00e2che de signature vous est assign\u00e9e';
        if (n.eventType === 'SIGNED')     return 'par ' + (n.signerName || '');
        if (n.eventType === 'REJECTED')   return 'rejet\u00e9 par ' + (n.signerName || '');
        if (n.eventType === 'COMPLETED')  return 'Tous les signataires ont sign\u00e9';
        return '';
    }

    function docUuid(n) {
        var ref = n.documentNodeRef || n.nodeId || '';
        return ref.split('/').pop();
    }

    function renderDropdown() {
        var list = document.getElementById('sg-bell-list');
        if (!list) return;
        list.innerHTML = '';

        if (notifications.length === 0) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Aucune notification</div>';
            return;
        }

        notifications.forEach(function(n) {
            var item = document.createElement('div');
            var info = getEventInfo(n.eventType);
            var detail = notifDetail(n);

            item.style.cssText = 'padding:12px 16px;border-bottom:1px solid #f0f0f0;cursor:pointer;display:flex;align-items:flex-start;gap:10px;';
            item.innerHTML = '<span style="font-size:18px;color:' + info.color + ';font-weight:bold;">' + info.icon + '</span>' +
                '<div style="flex:1;">' +
                '<div style="font-weight:bold;color:#333;">' + info.title + '</div>' +
                '<div style="color:#555;word-break:break-word;">' + escapeHtml(n.documentName) + '</div>' +
                '<div style="color:#888;font-size:11px;margin-top:2px;">' + escapeHtml(detail) + '</div>' +
                '</div>';

            item.addEventListener('click', function() {
                markRead([n.nodeId]);
                notifications = notifications.filter(function(x) { return x.nodeId !== n.nodeId; });
                updateBadge(notifications.length);
                window.location.hash = '/preview/' + docUuid(n);
                if (dropdown) dropdown.style.display = 'none';
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

    // Persist read state on the repo (fire and forget)
    function markRead(nodeIds) {
        if (!nodeIds || nodeIds.length === 0 || !authHeader) return;
        try {
            fetch(READ_URL + '?ids=' + encodeURIComponent(nodeIds.join(',')), {
                method: 'POST',
                headers: { 'Authorization': authHeader },
                credentials: 'include'
            }).catch(function() {});
        } catch (e) { /* silent */ }
    }

    function markAllRead() {
        try {
            if (authHeader) {
                fetch(READ_URL + '?all=true', {
                    method: 'POST',
                    headers: { 'Authorization': authHeader },
                    credentials: 'include'
                }).catch(function() {});
            }
        } catch (e) { /* silent */ }
        notifications = [];
        updateBadge(0);
        renderDropdown();
    }

    // Auto-mark read when the document is currently being previewed in ACA
    function checkConsulted(unreadList) {
        var hash = window.location.hash || '';
        if (hash.indexOf('/preview/') === -1) return unreadList;
        var toMark = [];
        unreadList.forEach(function(n) {
            var uuid = docUuid(n);
            if (uuid && hash.indexOf(uuid) !== -1) toMark.push(n);
        });
        if (toMark.length === 0) return unreadList;
        var marked = {};
        var ids = [];
        toMark.forEach(function(n) { marked[n.nodeId] = true; ids.push(n.nodeId); });
        markRead(ids);
        return unreadList.filter(function(n) { return !marked[n.nodeId]; });
    }

    // --- Polling ---
    function fetchNotifications() {
        if (!authHeader) {
            console.log('[SG Bell] No auth header captured yet, waiting...');
            return;
        }

        var url = WEBSPI_URL + '?since=' + lastTimestamp;
        fetch(url, {
            method: 'GET',
            headers: { 'Authorization': authHeader },
            credentials: 'include'
        })
        .then(function(response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function(data) {
            if (data.timestamp) {
                lastTimestamp = data.timestamp;
            }
            if (data.notifications) {
                // Keep only unread; drop ones whose document is being viewed
                var unread = data.notifications.filter(function(n) { return !n.read; });
                unread = checkConsulted(unread);

                var newOnes = [];
                unread.forEach(function(n) {
                    var key = n.nodeId + '_' + n.notificationDate;
                    if (!shownNotifications[key]) {
                        shownNotifications[key] = true;
                        newOnes.push(n);
                    }
                });

                var hadNew = newOnes.length > 0;
                notifications = unread.slice(0, 20);
                updateBadge(notifications.length);
                renderDropdown();

                if (hadNew) {
                    newOnes.forEach(function(n) {
                        if ('Notification' in window && Notification.permission === 'granted') {
                            var info = getEventInfo(n.eventType);
                            var notif = new Notification(info.title, { body: n.documentName + ' ' + notifDetail(n), icon: '/assets/favicon-96x96.png' });
                            notif.onclick = function() {
                                window.focus();
                                window.location.hash = '/preview/' + docUuid(n);
                            };
                        }
                    });
                }
            }
        })
        .catch(function(err) {
            console.log('[SG Bell] Poll error:', err.message);
        });
    }

    function waitForHeader() {
        var attempts = 0;
        var maxAttempts = 30;
        var interval = setInterval(function() {
            attempts++;
            var header = document.querySelector('app-header, [data-automation-id="app-header"], .app-header, header, .aca-header');
            if (header) {
                clearInterval(interval);
                createBell();
                fetchNotifications();
                setInterval(fetchNotifications, POLL_INTERVAL);
            } else if (attempts > maxAttempts) {
                clearInterval(interval);
                // Fallback to fixed position
                createBell();
            }
        }, 1000);
    }

    function init() {
        // Request browser notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Wait for header
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', waitForHeader);
        } else {
            waitForHeader();
        }
    }

    init();
})();
