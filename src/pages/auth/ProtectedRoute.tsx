import React from "react";
import { Navigate } from "react-router-dom";
import { Loader, Stack } from "@mantine/core";
import { useAuthenticator } from "@aws-amplify/ui-react";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  if (authStatus === "configuring") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Stack align="center">
          <Loader size="sm" />
        </Stack>
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
