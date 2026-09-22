{
    "found": ${(found!false)?string("true","false")},
    "documentName": "${(documentName!"")?json_string}",
    "nodeRef": "${(nodeRef!"")?json_string}",
    "status": "${(status!"")?json_string}",
    "initiatedBy": "${(initiatedBy!"")?json_string}",
    "initiatedByName": "${(initiatedByName!"")?json_string}",
    "workflowId": "${(workflowId!"")?json_string}",
    "documentHash": "${(documentHash!"")?json_string}",
    "proofNodeRef": "${(proofNodeRef!"")?json_string}",
    "proofUrl": "${(proofUrl!"")?json_string}",
    "signatureDate": ${(signatureDate!0)?c},
    "signatories": [<#list (signatories![]) as s>"${s?json_string}"<#if s_has_next>,</#if></#list>],
    "entries": [
<#list (entries![]) as e>
        {
            "date": "${e.date?json_string}",
            "signer": "${e.signer?json_string}",
            "signerName": "${e.signerName?json_string}",
            "action": "${e.action?json_string}",
            "hash": "${e.hash?json_string}",
            "taskId": "${e.taskId?json_string}",
            "comment": "${e.comment?json_string}",
            "workflowId": "${e.workflowId?json_string}"
        }<#if e_has_next>,</#if>
</#list>
    ]
}
