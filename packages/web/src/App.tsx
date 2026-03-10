import { CONTRIBUTOR_ROLES } from "@agenoconcern/shared";

export function App() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: "2rem", textAlign: "center" }}>
      <h1>Age No Concern</h1>
      <p>Foundation loading...</p>
      <p style={{ fontSize: "0.875rem", color: "#666" }}>
        Roles available: {CONTRIBUTOR_ROLES.join(", ")}
      </p>
    </div>
  );
}
