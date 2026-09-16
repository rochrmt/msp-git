{
    "results": [
        <#list results as r>"${r?json_string}"<#if r_has_next>,</#if></#list>
    ]
}
