import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Amplify } from 'aws-amplify'

import "./index.css";
import App from "./App.tsx";
import {COGNITO_CLIENT_ID, COGNITO_DOMAIN, COGNITO_USER_POOL_ID} from "./constants.ts";

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: COGNITO_USER_POOL_ID,
            userPoolClientId: COGNITO_CLIENT_ID,
            loginWith: {
                oauth: {
                    domain: COGNITO_DOMAIN
                        .replace('https://', ''),
                    scopes: ['email', 'openid', 'profile'],
                    redirectSignIn: [window.location.origin + '/auth/callback'],
                    redirectSignOut: [window.location.origin + '/auth/logout'],
                    responseType: 'code',
                },
            },
        },
    },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
