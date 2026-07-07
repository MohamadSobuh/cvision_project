import React, { useEffect } from 'react'
import style from "./Quiz.module.css";
import InputError from "../../components/ui/InputError";
import AdminInput from "../../components/ui/AdminInput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { questionSchema } from "../../utils/validationSchema";

const AddQuestionsForm = ({ t, formData = null, onClose, handleAdd, handleEdit, tasksFromDB }) => {
    const { register, handleSubmit, formState: { errors }, reset } = useForm({
        resolver: yupResolver(questionSchema)
    });

    const handleClose = () => {
        reset();
        onClose();
    };
    const questionTypes = [
        { id: 1, name: "Task Quiz" },
        { id: 2, name: "Placement Test" }
    ];

    const onSubmit = (data) => {
        const formattedPayload = {
            id: formData?.id,
            type: data.questionType,
            task: data.associatedTask,
            text: data.questionText,
            options: [
                { text: data.option1, isCorrect: data.correctAnswer === "option1" },
                { text: data.option2, isCorrect: data.correctAnswer === "option2" },
                { text: data.option3, isCorrect: data.correctAnswer === "option3" },
                { text: data.option4, isCorrect: data.correctAnswer === "option4" },
            ]
        };
        console.log(formattedPayload, "formattedPayload");

        if (formData?.id) {
            handleEdit(formattedPayload);
        } else {
            handleAdd(formattedPayload);
        }
    };

    useEffect(() => {
        if (formData?.id) {
            const initialValues = {
                questionType: formData.type || "",
                associatedTask: formData.task || "",
                questionText: formData.text || "",
                option1: formData.options?.[0]?.text || "",
                option2: formData.options?.[1]?.text || "",
                option3: formData.options?.[2]?.text || "",
                option4: formData.options?.[3]?.text || "",
                correctAnswer: formData.options?.findIndex(opt => opt.isCorrect) !== -1
                    ? `option${formData.options.findIndex(opt => opt.isCorrect) + 1}`
                    : ""
            };
            reset(initialValues);
        } else {
            reset({
                questionType: "",
                associatedTask: "",
                questionText: "",
                option1: "",
                option2: "",
                option3: "",
                option4: "",
                correctAnswer: ""
            });
        }
    }, [formData, reset]);

    return (
        <div className={style.modalOverlay} onClick={onClose}>
            <div className={style.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2 style={{ marginBottom: "20px", color: "#1A83A8" }}>
                    {formData?.id ? t('editQuestion') : t('addQuestion')}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                        <div style={{ flex: 1 }}>
                            <label className={style.labelStyle}>{t('questionType')}</label>
                            <select {...register("questionType")} className={style.selectStyle} defaultValue="">
                                <option value="" disabled hidden>{t('selectQuestionType')}</option>
                                {questionTypes.map(questionType => (
                                    <option key={questionType.id} value={questionType.name}>
                                        {questionType.name}
                                    </option>
                                ))}
                            </select>
                            <InputError error={errors.questionType} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className={style.labelStyle}>{t('associatedTask')}</label>
                            <select {...register("associatedTask")} className={style.selectStyle} defaultValue="">
                                <option value="" disabled hidden>{t('selectTask')}</option>
                                {tasksFromDB?.map((task) => (
                                    <option key={task.id} value={task.task}>{task.task}</option>
                                ))}
                            </select>
                            <InputError error={errors.associatedTask} />
                        </div>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label className={style.c}>{t('questionText')}</label>
                        <textarea
                            {...register("questionText")}
                            placeholder={t('enterQuestionText')}
                            rows={3}
                            className={style.textareaStyle}
                        />
                        <InputError error={errors.questionText} />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label className={style.labelStyle}>{t('answerOptions')}</label>
                        {[1, 2, 3, 4].map((num) => (
                            <div key={num} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                                <input
                                    type="radio"
                                    value={`option${num}`} // التأكد من أنها تطابق correctAnswer في الـ Schema
                                    {...register("correctAnswer")}
                                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#1A83A8" }}
                                />
                                <div style={{ flex: 1 }}>
                                    <AdminInput
                                        type="text"
                                        placeholder={`${t('option')} ${num}`}
                                        registerProps={register(`option${num}`)}
                                    />
                                </div>
                            </div>
                        ))}
                        <InputError error={errors.correctAnswer || errors.option1 || errors.option2 || errors.option3 || errors.option4} />
                    </div>

                    <div className={style.modalButtons} style={{ justifyContent: "flex-end" }}>
                        <button type="button" className={style.btnOutline} onClick={handleClose}>
                            {t('cancel')}
                        </button>
                        <button type="submit" className={style.btnActive}>
                            {formData?.id ? t('saveChanges') : t('save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddQuestionsForm;