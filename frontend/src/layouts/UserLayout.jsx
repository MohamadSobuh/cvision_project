import { Outlet, useLocation } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function UserLayout({ user, language, setLanguage }) {
    const { pathname } = useLocation();
    const normalizedPath = pathname.toLowerCase();
    const isQuizActive =
        normalizedPath.startsWith("/user/initalassquiz") ||
        normalizedPath.startsWith("/user/quiz");

    return (
        <div>
            {!isQuizActive && <Sidebar language={language} />}
            <div>
                {!isQuizActive && (
                    <Header user={user} language={language} setLanguage={setLanguage} />
                )}
                <div>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
