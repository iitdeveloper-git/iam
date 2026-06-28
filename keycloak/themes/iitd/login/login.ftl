<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=social.displayInfo displayMessage=!messagesPerField.existsError('username','password'); section>
  <#if section = "header">
    IITD IAM
  <#elseif section = "form">
    <div class="iitd-login-brand">
      <div class="iitd-logo">IITDEVELOPER</div>
      <p>Secure access for IITDEVELOPER products</p>
    </div>
    <form id="kc-form-login" action="${url.loginAction}" method="post">
      <label for="username">Email or username</label>
      <input tabindex="1" id="username" name="username" value="${(login.username!'')}" type="text" autofocus autocomplete="username" />
      <label for="password">Password</label>
      <input tabindex="2" id="password" name="password" type="password" autocomplete="current-password" />
      <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
      <button tabindex="4" name="login" id="kc-login" type="submit">Sign in</button>
    </form>
  </#if>
</@layout.registrationLayout>

