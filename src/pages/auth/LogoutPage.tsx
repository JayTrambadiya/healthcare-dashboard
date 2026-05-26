import React, { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader, Stack, Text } from "@mantine/core";
import { useAuthenticator } from "@aws-amplify/ui-react";

const LogoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { authStatus, signOut } = useAuthenticator((context) => [
    context.authStatus,
    context.signOut,
  ]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      signOut();
      navigate("/login", { replace: true });
    }
  }, [authStatus, navigate, signOut]);

  if (authStatus === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#191c1c]">
      <Stack align="center" gap="xs">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Signing you out...
        </Text>
      </Stack>
    </div>
  );
};

export default LogoutPage;
