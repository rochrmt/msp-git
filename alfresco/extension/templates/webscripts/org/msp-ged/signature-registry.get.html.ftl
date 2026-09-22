<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Registre des documents signés — MSP-GED</title>
<style>
body { font-family: Arial, sans-serif; margin: 30px; color: #222; }
h1 { font-size: 20px; color: #0a4d8c; margin-bottom: 4px; }
.subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #bbb; padding: 6px 8px; font-size: 12px; text-align: left; vertical-align: top; }
th { background: #eef3f8; }
.status-SIGNED { color: #1a7f37; font-weight: bold; }
.status-REJECTED { color: #cf222e; font-weight: bold; }
.status-PENDING { color: #0969da; font-weight: bold; }
.hash { font-family: monospace; font-size: 10px; word-break: break-all; }
.muted { color: #666; font-size: 10px; }
.empty { padding: 30px; text-align: center; color: #888; }
.actions { margin-bottom: 15px; }
.btn { background: #0a4d8c; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
@media print { .actions { display: none; } body { margin: 10px; } }
</style>
</head>
<body>
<div class="actions">
    <button class="btn" onclick="window.print()">Imprimer le registre</button>
</div>
<h1>Registre des documents signés</h1>
<div class="subtitle">MSP-GED — Ministère de la Santé et de la Population</div>
<#if docs?size == 0>
<div class="empty">Aucun document traité par le workflow de signature pour le moment.</div>
<#else>
<table>
    <tr>
        <th>Document</th>
        <th>Statut</th>
        <th>Initiateur</th>
        <th>Signataires</th>
        <th>Signatures</th>
        <th>Date</th>
        <th>Empreinte SHA-256</th>
        <th>Preuve</th>
    </tr>
    <#list docs as d>
    <tr>
        <td><a href="/share/page/document-details?nodeRef=${d.nodeRef?url}" style="color:#0a4d8c;">${d.name?html}</a><br><span class="muted">${d.nodeRef?html}</span></td>
        <td class="status-${d.status}"><#if d.status == 'SIGNED'>SIGNÉ<#elseif d.status == 'REJECTED'>REJETÉ<#else>EN COURS</#if></td>
        <td>${d.initiatedByName?html}<br><span class="muted">${d.initiatedBy?html}</span></td>
        <td>${d.signerNames?html}<#if d.status == 'REJECTED' && d.rejectedByName != ''><br><span class="muted">Rejeté par ${d.rejectedByName?html}</span></#if></td>
        <td>${d.signCount?c}</td>
        <td><#if d.signatureDateStr != ''>${d.signatureDateStr?html}</#if></td>
        <td class="hash">${d.documentHash?html}</td>
        <td><#if d.proofUrl != ''><a href="${d.proofUrl}" target="_blank" style="color:#0a4d8c;">Preuve</a></#if></td>
    </tr>
    </#list>
</table>
</#if>
</body>
</html>
