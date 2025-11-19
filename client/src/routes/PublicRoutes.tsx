import AuthRoute from "@/components/AuthRoute";
import Login from "@/pages/Login";
import SharedMeeting from "@/pages/SharedMeeting";
import { Route } from "react-router-dom";

const PublicRoutes = () => {
  return [
    <Route key="root" path="/" element={<AuthRoute />} />,
    <Route key="login" path="/login" element={<Login />} />,
    <Route key="shared-meeting" path="/shared/:meetingId" element={<SharedMeeting />} />
  ];
};

export default PublicRoutes; 