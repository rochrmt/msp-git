{
    "dryRun": ${dryRun?c},
    "scanned": ${scanned?c},
    "fixedCount": ${fixedCount?c},
    "fixed": [<#list (fixed![]) as f>"${f?json_string}"<#if f_has_next>,</#if></#list>],
    "debug": [<#list (debug![]) as d>"${d?json_string}"<#if d_has_next>,</#if></#list>]
}
