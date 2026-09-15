/**
 * Signature notifications for MSP-GED
 * Polls signature events and shows toast/bell notifications
 * Event types: ASSIGNMENT, SIGNED, REJECTED, COMPLETED
 * Read state is persisted server-side (sg:notificationRead)
 */
(function() {
    'use strict';

    console.log('[SG Share] v5 loaded - read/unread support');

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
                markRead([n.nodeId]);
                notifications = notifications.filter(function(x) { return x.nodeId !== n.nodeId; });
                updateBadge(notifications.length);
                if (n.eventType === 'ASSIGNMENT' && n.taskId) {
                    window.location.href = '/share/page/task-edit?taskId=activiti$' + encodeURIComponent(n.taskId);
                } else if (n.documentNodeRef) {
                    window.location.href = '/share/page/document-details?nodeRef=' + encodeURIComponent(n.documentNodeRef);
                } else {
                    window.location.href = '/share/page/my-tasks#filter=workflows|active';
                }
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
        if (!nodeIds || nodeIds.length === 0) return;
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', READ_URL + '?ids=' + encodeURIComponent(nodeIds.join(',')), true);
            xhr.withCredentials = true;
            xhr.send();
        } catch (e) { /* silent */ }
    }

    function markAllRead() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', READ_URL + '?all=true', true);
            xhr.withCredentials = true;
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
            markRead([n.nodeId]);
            if (n.eventType === 'ASSIGNMENT' && n.taskId) {
                window.location.href = '/share/page/task-edit?taskId=activiti$' + encodeURIComponent(n.taskId);
            } else if (n.documentNodeRef) {
                window.location.href = '/share/page/document-details?nodeRef=' + encodeURIComponent(n.documentNodeRef);
            } else {
                window.location.href = '/share/page/my-tasks#filter=workflows|active';
            }
            toast.remove();
        });

        document.body.appendChild(toast);
        setTimeout(function() {
            if (toast.parentElement) toast.remove();
        }, 8000);
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
