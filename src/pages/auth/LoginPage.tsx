import React from "react";
import { Navigate } from "react-router-dom";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";

const LoginPage: React.FC = () => {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  if (authStatus === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#191c1c] px-4">
      <div className="w-full max-w-md">
        <Authenticator socialProviders={["google"]} />
      </div>
    </div>
  );
};

export default LoginPage;
