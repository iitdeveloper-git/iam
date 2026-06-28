export const oidcConfig = {
  authority: "http://localhost:8080/realms/iitd",
  client_id: "my-spa",
  redirect_uri: "http://localhost:3030/callback",
  post_logout_redirect_uri: "http://localhost:3030",
  response_type: "code",
  scope: "openid profile email"
};

