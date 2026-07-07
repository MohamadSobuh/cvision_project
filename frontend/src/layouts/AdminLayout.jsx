import { Outlet } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
export default function AdminLayout({ user, language, setLanguage }) {
    return (
        <div>
            <AdminSidebar language={language} />
            <div>
                <AdminHeader user={user} language={language} setLanguage={setLanguage} />
                <div>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
