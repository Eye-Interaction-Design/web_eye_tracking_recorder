import { EyeTrackerProvider } from "../../../packages/react";
import EyeTrackingDemo from "./components/EyeTrackingDemo";

function App() {
  return (
    <EyeTrackerProvider autoInitialize={false}>
      <EyeTrackingDemo />
    </EyeTrackerProvider>
  );
}

export default App;
