import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";
import { ModuleRegistry } from "ag-grid-community";
import { AgGridProvider } from "ag-grid-react";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@aws-amplify/ui-react/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useLocalStorage } from "@mantine/hooks";
import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { signOut } from "aws-amplify/auth";
import { Authenticator } from "@aws-amplify/ui-react";
import MRFFilesPage from "./pages/mrf-files/MRFFilesPage";
import LoginPage from "./pages/auth/LoginPage";
import ProtectedRoute from "./pages/auth/ProtectedRoute";
import PublicMRFFileViewPage from "./pages/public-mrf-file-view/PublicMRFFileViewPage";
import { appTheme } from "./theme";
import { MANTINE_LICENSE_KEY } from "./constants";
import CSVStepper from "./pages/generate-csv/CSVStepper.tsx";

LicenseManager.setLicenseKey(MANTINE_LICENSE_KEY);
ModuleRegistry.registerModules([AllEnterpriseModule]);
const modules = [AllEnterpriseModule];

function App() {
  const [colorScheme, setColorScheme] = useLocalStorage<"light" | "dark">({
    key: "app-color-scheme",
    defaultValue: "light",
  });

  const isDark = colorScheme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleToggleTheme = () => {
    setColorScheme(isDark ? "light" : "dark");
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      window.location.replace("/login");
    }
  };

  return (
    <AgGridProvider modules={modules}>
      <MantineProvider
        theme={appTheme}
        defaultColorScheme={colorScheme}
        forceColorScheme={colorScheme}
      >
        <Notifications position="top-right" />
        <Authenticator.Provider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/public/mrf-file-view/:jobId"
                element={<PublicMRFFileViewPage isDark={isDark} />}
              />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <CSVStepper
                      isDark={isDark}
                      onToggleTheme={handleToggleTheme}
                      onLogout={handleLogout}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mrf-files"
                element={
                  <ProtectedRoute>
                    <MRFFilesPage
                      isDark={isDark}
                      onToggleTheme={handleToggleTheme}
                      onLogout={handleLogout}
                    />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </Authenticator.Provider>
      </MantineProvider>
    </AgGridProvider>
  );
}

export default App;
