import { useCallback, useEffect, useMemo, useState } from 'react'
import style from "./TaskAssQuiz.module.css";
import { FaArrowLeft, FaArrowRight, FaExclamationCircle, FaSpinner, FaTimes } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserFlow } from '../../context/UserFlowContext';
import { useTranslation } from "react-i18next";
import api from "../../utils/axios";
import useQuizNavigationLock from "../../hooks/useQuizNavigationLock";
import { confirmToast, notify } from "../../utils/toast";


export default function InitalAssQuiz({ language }) {
    const navigate = useNavigate();
    const unlockQuizNavigation = useQuizNavigationLock();
    const { t } = useTranslation();



    const { state } = useLocation();
    const weaknesses = useMemo(
        () => state?.weaknesses?.map(w => w.skill) || [],
        [state?.weaknesses],
    );
    const [question, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const selectedField = state?.selectedField;
    const cvId = state?.cvId;
    console.log(weaknesses);



    const ensureAuth = useCallback(() => {
        const token = localStorage.getItem("accessToken");
        if (!token || token === "undefined") {
            navigate("/login", {
                state: {
                    message: language === "ar" ? "انتهت جلسة التسجيل، يرجى تسجيل الدخول مجدداً" : "Session expired, please log in again",
                    type: "error"
                }
            });
            return false;
        }
        return true;
    }, [language, navigate]);
    const fetchQuestions = useCallback(async (weaknessSkills) => {
        if (!ensureAuth()) return;
        setLoading(true);
        setLoadError(false);
        try {
            const response = await api.post('/userr/quiz/start-weakness/', {
                weakness_skills: weaknessSkills,
                target_field: selectedField
             });
            setQuestions(response.data || {});
        } catch (error) {
            console.error('Error fetching questions:', error);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [ensureAuth, selectedField]);
    useEffect(() => {
        fetchQuestions(weaknesses);
    }, [fetchQuestions, weaknesses]);





    // const weaknesses = [...new Set(questions.map(q => q.skill))];
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const totalQuestionsCount = question.questions?.length || 0;

    const answeredCount = Object.keys(answers).length;
    const progress = (answeredCount / question.questions?.length) * 100;

    const currentQuestion = question.questions?.[current];
    console.log(currentQuestion);

    const handleSelect = (optionId) => {
        setAnswers({
            ...answers,
            [currentQuestion.id]: optionId
        });
    };
    useEffect(() => {
        console.log(current);
        console.log(answers);
    }, [current,answers]);

    const next = () => {
        if (current < question.questions.length - 1) {
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
            t('exitQuizConfirm', 'Exit the assessment? Your answers will be lost.'),
            {
                confirmText: t('exitQuiz', 'Exit quiz'),
                cancelText: t('cancel', 'Cancel'),
            },
        );
        if (!shouldExit) return;

        unlockQuizNavigation();
        navigate("/user/dashboard", { replace: true });
    };

    const { setPlacementScore } = useUserFlow();

    //هون في تعديلات عشان في mark
    async function handleFinish() {
        if (isSubmitting || totalQuestionsCount === 0) return;
        if (!ensureAuth()) return;

        try {
            setIsSubmitting(true);

            // 🔥 تحويل كائن الإجابات {52: 'B'} إلى مصفوفة كائنات المتوقعة في الباكيند
            const formattedAnswers = Object.entries(answers).map(([qId, selectedOpt]) => ({
                question_id: parseInt(qId, 10), // التأكد من إرسال الـ ID كرقم وليس نص
                selected_answer: selectedOpt
            }));

            // إرسال طلب حفظ الإجابات وتصحيح الاختبار للباكيند
            const response = await api.post('/userr/quiz/submit-weakness/', {
                question_ids: question.question_ids || [],
                cv_id: cvId,
                answers: formattedAnswers // البيانات المعدلة هنا جاهزة تماماً 🚀
            });

            const resultData = response.data;

            // تحديث الـ Context بنسبة النجاح القادمة من السيرفر
            if (resultData.score_percentage !== undefined) {
                setPlacementScore(resultData.score_percentage);
            }
            console.log(resultData.score_percentage);
            console.log(resultData.passed);
            console.log(resultData.skills_results);




            // التوجيه لصفحة النتيجة مع تمرير كافة التفاصيل العائدة من السيرفر
            unlockQuizNavigation();
            navigate('/user/quizResult', {
                state: {
                    score: resultData.score_percentage,
                    passed: resultData.passed,
                    skillsResults: resultData.skills_results,
                    mode: "initial",
                    selectedField,
                    learningPlanId: resultData.learning_plan_id,
                    unavailableSkills: resultData.unavailable_skills
                }
            });

        } catch (error) {
            console.error('Error submitting quiz answers:', error);
            notify(
                language === 'ar'
                    ? 'حدث خطأ أثناء إرسال إجابات الاختبار.'
                    : 'An error occurred while submitting the quiz.',
                'error',
            );
        } finally {
            setIsSubmitting(false);
        }
    }
    if (loading) {
        return (
            <div className={language === 'ar' ? style.taskAssQuizAr : style.taskAssQuiz}>
                <div className={style.bgGrid} />
                <div className={style.quizState} role="status" aria-live="polite">
                    <FaSpinner className={style.quizStateSpinner} />
                    <h2>{t('loadingAssessmentQuiz')}</h2>
                    <p>{t('loadingAssessmentQuizWait')}</p>
                </div>
            </div>
        );
    }

    if (loadError || !question || question.questions?.length === 0) {
        return (
            <div className={language === 'ar' ? style.taskAssQuizAr : style.taskAssQuiz}>
                <div className={style.bgGrid} />
                <div className={style.quizState} role="alert">
                    <FaExclamationCircle className={style.quizStateErrorIcon} />
                    <h2>{t(loadError ? 'assessmentQuizLoadError' : 'noQuizQuestions')}</h2>
                    <p>{t(loadError ? 'quizLoadErrorMessage' : 'noQuizQuestionsMessage')}</p>
                    <div className={style.quizStateActions}>
                        <button type="button" className={style.quizRetryButton} onClick={() => fetchQuestions(weaknesses)}>
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
                    <h1><b>{t('titleQuizPage')}</b></h1>
                    <button type="button" className={style.exitButton} onClick={handleExit}>
                        <FaTimes /> {t('exitQuiz', 'Exit quiz')}
                    </button>
                </div>

                <div className={style.quizContent}>
                <div className={style.qA}>
                    <h5>{currentQuestion?.question}</h5>
                    {currentQuestion?.options.map((opt) => (
                        <label key={opt.id} className={style.option}>
                            <input
                                type="radio"
                                name={`question-${currentQuestion.id}`}
                                value={opt.id}
                                checked={answers[currentQuestion.id] === opt.id}
                                onChange={() => handleSelect(opt.id)}
                            />
                            <span className={style.newRadio}></span>
                            <span className={style.text}>{opt.text}</span>
                        </label>
                    ))}

                    <div className={style.btn}>
                        <button className={style.prev} onClick={prev}> <FaArrowLeft /> {t('prev')} </button>
                        <button className={style.next} onClick={next}>{t('next')} <FaArrowRight /> </button>
                    </div>
                </div>

                <div className={style.qCard}>
                    <p><b>{t('questionsCard')}</b></p>
                    {question.questions?.map((q, index) => {
            const isCurrent = index === current;
            const isAnswered = !!answers[q.id];

            // تحديد الكلاس المناسب بناءً على حالة السؤال الحالية لمنع التضارب
            let itemClass = style.qItem;
            if (isCurrent && isAnswered) {
                itemClass += ` ${style.activeAndAnswered}`;
            } else if (isCurrent) {
                itemClass += ` ${style.active}`;
            } else if (isAnswered) {
                itemClass += ` ${style.answeredQ}`;
            }

            return (
                <div
                    key={q.id}
                    className={itemClass}
                    onClick={() => setCurrent(index)}
                >
                    {index + 1}
                </div>
            );
        })}
                    <br />

                    <p className={style.progressText}>
                        {answeredCount} / {question.questions?.length} {t('answeredLabel')}
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

                    <div className={style.submitContainer} onClick={handleFinish}>
                        <button className={style.submit} > {t('finish')} </button>
                    </div>
                </div>
            </div>
            </main>
        </div>
    );
}
