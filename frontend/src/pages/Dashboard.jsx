import MainLayout from "../layouts/MainLayout";
import StatCard from "../components/StatCard";

function Dashboard() {
  return (
    <MainLayout>
      <h1>SupplyPilot-AI Dashboard</h1>

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginTop: "30px",
          flexWrap: "wrap",
        }}
      >
        <StatCard title="Total Shipments" value="1,245" />
        <StatCard title="On-Time Delivery" value="96%" />
        <StatCard title="Delayed Orders" value="32" />
      </div>
    </MainLayout>
  );
}

export default Dashboard;