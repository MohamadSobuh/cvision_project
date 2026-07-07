import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ACTIVE_QUIZ_KEY = "activeQuiz";

export default function useQuizNavigationLock() {
    const location = useLocation();

    useEffect(() => {
        const storedQuiz = sessionStorage.getItem(ACTIVE_QUIZ_KEY);
        let storedState = null;

        try {
            storedState = storedQuiz ? JSON.parse(storedQuiz).state : null;
        } catch {
            sessionStorage.removeItem(ACTIVE_QUIZ_KEY);
        }

        sessionStorage.setItem(ACTIVE_QUIZ_KEY, JSON.stringify({
            path: location.pathname,
            state: location.state || storedState,
        }));

        const warnBeforeLeaving = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", warnBeforeLeaving);
        return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
    }, [location.pathname, location.state]);

    return useCallback(() => {
        sessionStorage.removeItem(ACTIVE_QUIZ_KEY);
    }, []);
}
