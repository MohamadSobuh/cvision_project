import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import style from "./AddTopics.module.css";
import AdminInput from "../../components/ui/AdminInput";
import InputError from "../../components/ui/InputError";
import { topicSchema } from "../../utils/validationSchema";
import api from "../../utils/axios";



const AddTopicform = ({ formData = null, onClose, handleEdit, handleAdd, t }) => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(topicSchema)
    });
    const [fields, setFields] = useState([]);
    useEffect(() => {
        if (formData?.id) {
            const selectedFieldId =
                formData.learning_plan ||
                formData.learning_plan_id ||
                fields.find((field) => field.name === formData.category)?.id ||
                "";

            reset({
                ...formData,
                learning_plan: selectedFieldId,
                difficulty: formData.difficulty?.toLowerCase() || "",
            });
        } else {
            reset();
        }
    }, [fields, formData, reset]);

    useEffect(() => {
        const fetchAdminPlans = async () => {
            try {
                const response = await api.get('/dashboard/learning-plans/');
                setFields(response.data.results || response.data);
            } catch (error) {
                console.error("Error fetching admin catalog plans:", error);
            }
        };

        fetchAdminPlans();
    }, []);

    const onFormSubmit = (data) => {
        const selectedField = fields.find(
            (field) => String(field.id) === String(data.learning_plan)
        );
        const payload = {
            ...data,
            category: selectedField?.name || formData?.category || "",
        };

        if (formData?.id) {
            handleEdit({ ...payload, id: formData.id });
        } else {
            handleAdd(payload);
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const difficulties = [
        { id: 1, name: "Easy" },
        { id: 2, name: "Medium" },
        { id: 3, name: "Hard" }
    ];

    return (
        <div className={style.modalOverlay} onClick={handleClose}>
            <div className={style.modalContent} onClick={e => e.stopPropagation()}>
                <h2 style={{ marginBottom: "20px", color: "#1A83A8" }}>
                    {formData?.id ? t('editTopic') || "Edit Topic" : t('addNewTopic') || "Add Topic"}
                </h2>

                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <div style={{ marginBottom: "15px" }}>
                        <label>{t('topicTitleLabel')}</label>
                        <AdminInput
                            registerProps={register("title")}
                            placeholder={t('topicPlaceholder')}
                        />
                        <InputError error={errors.title} />
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <label>{t('description')}</label>
                        <textarea
                            {...register("desc")}
                            className={style.textareaStyle}
                            rows="4"
                            placeholder={t('descPlaceholder')}
                        />
                        <InputError error={errors.desc} />
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <label>{t('careerFieldLabel')}</label>
                        <select {...register("learning_plan")} className={style.selectStyle} defaultValue="">
                            <option value="" disabled hidden>{t('selectField')}</option>
                            {fields.map(field => (
                                <option key={field.id} value={field.id}>
                                    {field.name}
                                </option>
                            ))}
                        </select>
                        <InputError error={errors.learning_plan} />
                    </div>
                    <div style={{ marginBottom: "15px" }}>
                        <label>{t('difficultyLabel')}</label>
                        <select {...register("difficulty")} className={style.selectStyle} defaultValue="">
                            <option value="" disabled hidden>{t('selectDifficulty')}</option>
                            {difficulties.map(difficulty => (
                                <option key={difficulty.id} value={difficulty.name.toLowerCase()}>
                                    {difficulty.name}
                                </option>
                            ))}
                        </select>
                        <InputError error={errors.difficulty} />
                    </div>

                    <div className={style.modalButtons}>
                        <button type="button" className={style.btnOutline} onClick={handleClose}>
                            {t('cancel')}
                        </button>
                        <button type="submit" className={style.btnActive}>
                            {formData?.id ? t('saveChanges') || "Save Changes" : t('save') || "Add Topic"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTopicform;
