import { LicenseManager, AllEnterpriseModule } from "ag-grid-enterprise";
import { ModuleRegistry } from "ag-grid-community";
import { AgGridProvider } from "ag-grid-react";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import CSVUploadPage from "./CSVUploadPage";

// Set enterprise license key
LicenseManager.setLicenseKey(
  "[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-129757}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{20 June 2026}____[v3]_[0102]_MTc4MTkxMDAwMDAwMA==9cd58759b550e76550a45df986bdf2dc",
);

// Replace AllCommunityModule with AllEnterpriseModule

// In AG Grid v32+, you register modules like this globally or pass them to AgGridProvider
ModuleRegistry.registerModules([AllEnterpriseModule]);

const modules = [AllEnterpriseModule];

function App() {
  return (
    <AgGridProvider modules={modules}>
      <MantineProvider>
        <CSVUploadPage />
      </MantineProvider>
    </AgGridProvider>
  );
}

export default App;
