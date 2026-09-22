/**
 * Signature proof panel for MSP-GED
 * On the document-details page, fetches the signature audit trail and
 * renders a "Preuve de signature" panel with a print button.
 */
(function() {
    'use strict';

    console.log('[SG Proof] v1 loaded');

    var PROOF_URL = '/share/proxy/alfresco/msp-ged/signature-proof';

    function getQueryParam(name) {
        var m = window.location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
        return m ? decodeURIComponent(m[1]) : null;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function statusBadge(status) {
        if (status === 'SIGNED') return '<span style="background:#1a7f37;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;">SIGNÉ</span>';
        if (status === 'REJECTED') return '<span style="background:#cf222e;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;">REJETÉ</span>';
        return '<span style="background:#0969da;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;">EN COURS</span>';
    }

    function buildPanel(data) {
        var panel = document.createElement('div');
        panel.id = 'sg-proof-panel';
        panel.style.cssText = 'margin:15px 0;padding:12px;border:1px solid #d0d7de;border-radius:6px;background:#fff;font-family:Arial,sans-serif;font-size:12px;';

        var html = '<div style="font-size:14px;font-weight:bold;color:#0a4d8c;margin-bottom:8px;">Preuve de signature</div>';
        html += '<table style="border:none;font-size:12px;margin-bottom:8px;">';
        html += '<tr><td style="border:none;padding:2px 10px 2px 0;color:#666;">Statut</td><td style="border:none;padding:2px 0;">' + statusBadge(data.status) + '</td></tr>';
        if (data.initiatedByName) {
            html += '<tr><td style="border:none;padding:2px 10px 2px 0;color:#666;">Initié par</td><td style="border:none;padding:2px 0;">' + escapeHtml(data.initiatedByName) + ' (' + escapeHtml(data.initiatedBy) + ')</td></tr>';
        }
        if (data.signatories && data.signatories.length > 0) {
            html += '<tr><td style="border:none;padding:2px 10px 2px 0;color:#666;">Signataires</td><td style="border:none;padding:2px 0;">' + escapeHtml(data.signatories.join(', ')) + '</td></tr>';
        }
        if (data.documentHash) {
            html += '<tr><td style="border:none;padding:2px 10px 2px 0;color:#666;">Empreinte SHA-256</td><td style="border:none;padding:2px 0;font-family:monospace;font-size:10px;word-break:break-all;">' + escapeHtml(data.documentHash) + '</td></tr>';
        }
        html += '</table>';

        if (data.entries && data.entries.length > 0) {
            html += '<div style="font-weight:bold;margin:8px 0 4px;">Historique</div>';
            html += '<table style="border-collapse:collapse;width:100%;">';
            html += '<tr style="background:#f6f8fa;"><th style="border:1px solid #d0d7de;padding:4px 6px;text-align:left;">#</th><th style="border:1px solid #d0d7de;padding:4px 6px;text-align:left;">Signataire</th><th style="border:1px solid #d0d7de;padding:4px 6px;text-align:left;">Action</th><th style="border:1px solid #d0d7de;padding:4px 6px;text-align:left;">Date / Heure</th><th style="border:1px solid #d0d7de;padding:4px 6px;text-align:left;">Empreinte</th><th style="border:1px solid #d0d7de;padding:4px 6px;text-align:left;">Commentaire</th></tr>';
            for (var i = 0; i < data.entries.length; i++) {
                var e = data.entries[i];
                var color = e.action === 'SIGNE' ? '#1a7f37' : '#cf222e';
                html += '<tr>' +
                    '<td style="border:1px solid #d0d7de;padding:4px 6px;">' + (i + 1) + '</td>' +
                    '<td style="border:1px solid #d0d7de;padding:4px 6px;">' + escapeHtml(e.signerName) + ' <span style="color:#666">(' + escapeHtml(e.signer) + ')</span></td>' +
                    '<td style="border:1px solid #d0d7de;padding:4px 6px;color:' + color + ';font-weight:bold;">' + escapeHtml(e.action) + '</td>' +
                    '<td style="border:1px solid #d0d7de;padding:4px 6px;">' + escapeHtml(e.date) + '</td>' +
                    '<td style="border:1px solid #d0d7de;padding:4px 6px;font-family:monospace;font-size:9px;word-break:break-all;max-width:160px;">' + escapeHtml(e.hash) + '</td>' +
                    '<td style="border:1px solid #d0d7de;padding:4px 6px;">' + escapeHtml(e.comment) + '</td>' +
                    '</tr>';
            }
            html += '</table>';
        }

        html += '<div style="margin-top:10px;">';
        if (data.found) {
            html += '<a href="' + PROOF_URL + '?nodeRef=' + encodeURIComponent(data.nodeRef) + '&amp;format=html" target="_blank" style="display:inline-block;background:#0a4d8c;color:#fff;padding:6px 12px;border-radius:4px;text-decoration:none;font-size:12px;margin-right:8px;">Voir / imprimer la preuve</a>';
        }
        html += '<a href="/share/proxy/alfresco/msp-ged/signature-registry" target="_blank" style="display:inline-block;background:#f6f8fa;color:#0a4d8c;padding:6px 12px;border-radius:4px;text-decoration:none;font-size:12px;border:1px solid #d0d7de;">Registre des signatures</a>';
        html += '</div>';

        panel.innerHTML = html;
        return panel;
    }

    function findAnchor() {
        // The panel must appear BEFORE the "Actions sur le document" section:
        // look for the actions panel in the right column of document-details
        var selectors = [
            '.document-actions',
            'div.actions',
            '.node-info'
        ];
        for (var i = 0; i < selectors.length; i++) {
            var el = document.querySelector(selectors[i]);
            if (el) return { el: el, before: true };
        }
        var meta = document.querySelector('.document-metadata');
        if (meta) return { el: meta, before: false };
        return null;
    }

    function inject(data) {
        if (document.getElementById('sg-proof-panel')) return;
        var anchor = findAnchor();
        var panel = buildPanel(data);
        if (anchor) {
            if (anchor.before) {
                anchor.el.parentNode.insertBefore(panel, anchor.el);
            } else {
                anchor.el.parentNode.insertBefore(panel, anchor.el.nextSibling);
            }
        } else {
            var bd = document.getElementById('bd') || document.body;
            bd.insertBefore(panel, bd.firstChild);
        }
    }

    function loadProof() {
        var href = window.location.href;
        if (href.indexOf('document-details') === -1) return;
        var nodeRef = getQueryParam('nodeRef');
        if (!nodeRef) return;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', PROOF_URL + '?nodeRef=' + encodeURIComponent(nodeRef), true);
        xhr.withCredentials = true;
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4 || xhr.status !== 200) return;
            try {
                var data = JSON.parse(xhr.responseText);
                if (data.found) inject(data);
            } catch (e) { /* silent */ }
        };
        xhr.send();
    }

    // The details page renders asynchronously: retry the anchor lookup
    var attempts = 0;
    function tryLoad() {
        loadProof();
        if (!document.getElementById('sg-proof-panel') && attempts++ < 20) {
            setTimeout(tryLoad, 1000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryLoad);
    } else {
        tryLoad();
    }
})();
