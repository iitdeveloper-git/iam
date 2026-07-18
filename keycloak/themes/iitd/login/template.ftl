<#macro registrationLayout displayInfo=false displayMessage=true displayRequiredFields=false showAnotherWayIfPresent=true>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sign In - IITD IAM</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/login.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
    <div class="login-page">
        <!-- Glowing background overlays -->
        <div class="glow-indigo"></div>
        <div class="glow-emerald"></div>
        
        <div class="login-wrapper">
            <!-- Logo and Header -->
            <div class="branding">
                <div class="logo-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <circle cx="12" cy="11" r="3" />
                        <path d="M12 14v4" />
                        <path d="M10 16h4" />
                    </svg>
                </div>
                <h1>IITD <span class="gradient-text">IAM</span></h1>
                <p class="subtitle">Secure authentication portal</p>
            </div>

            <div class="login-card">
                <!-- Display feedback messages (errors/alerts) -->
                <#if displayMessage && message?has_content>
                    <div class="alert alert-${message.type}">
                        <span class="alert-text">${message.summary}</span>
                    </div>
                </#if>

                <#nested "form">
            </div>
            
            <div class="footnote">
                Authorized Access Only • AES-256 encrypted
            </div>
        </div>
    </div>
</body>
</html>
</#macro>
