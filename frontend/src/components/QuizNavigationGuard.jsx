import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ACTIVE_QUIZ_KEY } from "../hooks/useQuizNavigationLock";

export default function QuizNavigationGuard() {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const storedQuiz = sessionStorage.getItem(ACTIVE_QUIZ_KEY);
        if (!storedQuiz) {
            return;
        }

        if (!localStorage.getItem("accessToken")) {
            sessionStorage.removeItem(ACTIVE_QUIZ_KEY);
            return;
        }

        try {
            const activeQuiz = JSON.parse(storedQuiz);
            if (activeQuiz.path && activeQuiz.path !== location.pathname) {
                navigate(activeQuiz.path, {
                    replace: true,
                    state: activeQuiz.state,
                });
            }
        } catch {
            sessionStorage.removeItem(ACTIVE_QUIZ_KEY);
        }
    }, [location.pathname, navigate]);

    return null;
}
