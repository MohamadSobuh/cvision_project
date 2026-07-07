import React, { useState, useEffect, useCallback } from 'react';
import style from "./TaskAssQuiz.module.css";
import { FaArrowLeft, FaArrowRight, FaExclamationCircle, FaSpinner, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../utils/axios";
import useQuizNavigationLock from "../../hooks/useQuizNavigationLock";
import { confirmToast } from "../../utils/toast";

export default function TaskAssQuiz({ language }) {
    const navigate = useNavigate();
    const unlockQuizNavigation = useQuizNavigationLock();
    const { t } = useTranslation();

    const { state } = useLocation();
    const { planTaskId } = useParams();
    const mode = state?.mode;
    const activeTask = state?.activeTask;

    const taskId = activeTask?.id || Number(planTaskId);
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const ensureAuth = useCallback(() => {
        const token = localStorage.getItem("accessToken");
        const role = localStorage.getItem("userRole");
        if (!token || token === "undefined" || role !== "user") {
            navigate("/login", {
                state: {
                    message: language === "ar" ? "انتهت جلسة التسجيل، يرجى تسجيل الدخول مجدداً" : "Session expired, please log in again",
                    type: "error"
                }
            });
            return false;
        }
        return true;
    }, [navigate, language]);

    // جلب بيانات الكويز الفعلي من الباك إند
    const loadQuestions = useCallback(async () => {
        if (!taskId || !ensureAuth()) return;

        setLoading(true);
        setLoadError(false);
        try {
            const response = await api.post(`/userr/quiz/start-task/${taskId}/`);
            const data = response.data;
            if (data?.questions && Array.isArray(data.questions)) {
                setQuestions(data.questions);
            } else if (Array.isArray(data)) {
                setQuestions(data);
            } else {
                setQuestions([]);
            }
        } catch (error) {
            console.error("Error fetching task quiz:", error);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [taskId, ensureAuth]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    const answeredCount = Object.keys(answers).length;
    const progress = questions.length ? (answeredCount / questions.length) * 100 : 0;
    const currentQuestion = questions && questions.length ? questions[current] : null;

    const handleSelect = (optionId) => {
        if (!currentQuestion) return;
        setAnswers({
            ...answers,
            [currentQuestion.id]: optionId
        });
    };

    const next = () => {
        if (current < questions.length - 1) {
            setCurrent(current + 1);
        }
    };

    const prev = () => {
        if (current > 0) {
            setCurrent(current - 1);
        }
    };

    const handleExit = async () => {
        const shouldExit = await confirmToast(
            t('exitQuizConfirm', 'Exit the quiz? Your answers will be lost.'),
            {
                confirmText: t('exitQuiz', 'Exit quiz'),
                cancelText: t('cancel', 'Cancel'),
            },
        );
        if (!shouldExit) return;

        unlockQuizNavigation();
        navigate("/user/dashboard", { replace: true });
    };

    const handleFinish = async () => {
        const formattedAnswers = Object.keys(answers).map(qId => ({
            question_id: parseInt(qId),
            selected_answer: answers[qId]
        }));

        const questionIds = questions.map(q => q.id);

        try {
            const response = await api.post(`/userr/quiz/submit-task/${taskId}/`, {
                question_ids: questionIds,
                answers: formattedAnswers
            });

            const resultData = response.data;
            console.log("Quiz submit response:", resultData);

            unlockQuizNavigation();
            navigate('/user/quizResult', {
                state: {
                    score: resultData.score_percentage,
                    passed: resultData.passed,
                    mode: "task",
                    results: resultData.results_per_question,
                    progress: resultData.progress,
                }
            });

        } catch (error) {
            console.error("حدث خطأ أثناء تسليم الكويز:", error.response?.data);
        }
    };

    if (loading) {
        return (
            <div className={language === 'ar' ? style.taskAssQuizAr : style.taskAssQuiz}>
                <div className={style.bgGrid} />
                <div className={style.quizState} role="status" aria-live="polite">
                    <FaSpinner className={style.quizStateSpinner} />
                    <h2>{t('loadingTaskQuiz')}</h2>
                    <p>{t('loadingTaskQuizWait')}</p>
                </div>
            </div>
        );
    }

    if (loadError || questions.length === 0) {
        return (
            <div className={language === 'ar' ? style.taskAssQuizAr : style.taskAssQuiz}>
                <div className={style.bgGrid} />
                <div className={style.quizState} role="alert">
                    <FaExclamationCircle className={style.quizStateErrorIcon} />
                    <h2>{t(loadError ? 'taskQuizLoadError' : 'noQuizQuestions')}</h2>
                    <p>{t(loadError ? 'quizLoadErrorMessage' : 'noQuizQuestionsMessage')}</p>
                    <div className={style.quizStateActions}>
                        <button type="button" className={style.quizRetryButton} onClick={loadQuestions}>
                            {t('retry')}
                        </button>
                        <button type="button" className={style.quizExitStateButton} onClick={handleExit}>
                            {t('exitQuiz')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={language === 'ar' ? style.taskAssQuizAr : style.taskAssQuiz} >
            <div className={style.bgGrid} />

            <main className={style.quizShell}>
                <div className={style.quizHeader}>
                    <h1><b>{mode === "task" ? t('taskQuiz') : t('titleQuizPage')}</b></h1>
                    <button type="button" className={style.exitButton} onClick={handleExit}>
                        <FaTimes /> {t('exitQuiz', 'Exit quiz')}
                    </button>
                </div>

                <div className={style.quizContent}>
                <div className={style.qA}>
                    <h5>{currentQuestion ? (currentQuestion.question || currentQuestion.question_text) : t('loading')}</h5>
                    {currentQuestion && currentQuestion.options && currentQuestion.options.map((opt) => (
                        <label key={opt.id} className={style.option}>
                            <input
                                type="radio"
                                name={`question-${currentQuestion.id}`}
                                value={opt.id}
                                checked={answers[currentQuestion.id] === opt.id}
                                onChange={() => handleSelect(opt.id)}
                            />
                            <span className={style.newRadio}></span>
                            {/* تأمين قراءة حقل النص بأي شكل قادم من السيرفر */}
                            <span className={style.text}>{opt.text || opt.answer || opt.option_text}</span>
                        </label>
                    ))}

                    <div className={style.btn}>
                        <button className={style.prev} onClick={prev}> <FaArrowLeft /> {t('prev')} </button>
                        <button className={style.next} onClick={next}>{t('next')} <FaArrowRight /> </button>
                    </div>
                </div>

                <div className={style.qCard}>
                    <p><b>{t('questionsCard')}</b></p>
                    {questions && questions.map((q, index) => (
                        <div
                            key={q.id}
                            className={`
                                ${style.qItem}
                                ${index === current ? style.active : ""}
                                ${answers[q.id] ? style.answeredQ : ""}
                            `}
                            onClick={() => setCurrent(index)}
                        >
                            {index + 1}
                        </div>
                    ))}
                    <br />

                    <p className={style.progressText}>
                        {answeredCount} / {questions.length} {t('answeredLabel')}
                    </p>
                    <div className={style.progressContainer}>
                        <div className={style.progressBar} style={{ width: `${progress}%` }}></div>
                    </div>
                    <hr style={{ color: "#4E6A54" }} />
                    <div className={style.item}>
                        <div className={style.current}></div>
                        <p>{t('current')}</p>
                    </div>

                    <div className={style.item}>
                        <div className={style.answered}></div>
                        <p>{t('answered')}</p>
                    </div>

                    <div className={style.item}>
                        <div className={style.notAnswered}></div>
                        <p>{t('notAnswered')}</p>
                    </div>

                    {/* 🟢 تم تعديل سطر الـ onClick هنا لحذف الأقواس المستدعاة فوراً */}
                    <div className={style.submitContainer}>
                        <button className={style.submit} onClick={handleFinish}> {t('finish')} </button>
                    </div>
                </div>
            </div>
            </main>
        </div>
    );
}
