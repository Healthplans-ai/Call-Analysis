import CallsTable from "./CallsTable.jsx";

// Unified call browser: every call, all filters (status, category, agent,
// prior-auth, search), CSV export and structured ZIP download.
export default function Results({ notify }) {
  return (
    <CallsTable
      notify={notify}
      features={["q", "category", "agent", "status", "priorAuth"]}
      exportable
    />
  );
}
