import React, { useEffect } from 'react';
import style from "./UserProfile.module.css";
import { useNavigate } from 'react-router-dom';
import profileImg from "../../images/profileImg.PNG";
import { useUserFlow } from '../../context/UserFlowContext';
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../components/ui/Input";
import InputError from "../../components/ui/InputError";
import { editProfileSchema } from "../../utils/validationSchema";
import { useForm } from "react-hook-form";
import { useState } from 'react';
import api from "../../utils/axios";

export default function EditProfile({ t, language }) {
    const { user, setUser } = useUserFlow();
    const navigate = useNavigate();

    const { register, handleSubmit, reset, setError, watch, formState: { errors } } = useForm({
        resolver: yupResolver(editProfileSchema),
        defaultValues: {
            firstname: "",
            lastname: "",
            email: "",
            field: "",
            bio: "",
            password: ""
        }
    });
    
    const [image, setImage] = useState(profileImg);
    const [imageFile, setImageFile] = useState(null);
    const profileField = watch("field");
    const fileInputRef = React.useRef(null);

    const ensureAuth = () => {
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
    };

    useEffect(() => {
        let isMounted = true;

        const fetchProfile = async () => {
            if (!ensureAuth()) return;
            try {
                const response = await api.get("/userr/profile/");
                if (!isMounted) return;
                console.log(response.data, "response data");
                reset({
                    firstname: response.data.firstname || "",
                    lastname: response.data.lastname || "",
                    email: response.data.email || "",
                    field: response.data.field || "",
                    bio: response.data.bio || "",
                    password: ""
                });
                setImage(response.data.image || profileImg);
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
        };

        fetchProfile();

        return () => {
            isMounted = false;
        };
    }, [reset]);

    useEffect(() => {
        if (user && !image) {
            reset({
                firstname: user.firstname || "",
                lastname: user.lastname || "",
                email: user.email || "",
                field: user.field || "",
                bio: user.bio || "",
                password: ""
            });
            setImage(user.image || profileImg);
        }
    }, [user, reset]);

    const handleImageClick = () => {
        fileInputRef.current.click();
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setImage(imageUrl);
            setImageFile(file);
        }
    };

    const handlePasswordStrength = (e) => {
        const val = e.target.value;
        let strength = 0;

        if (/[A-Z]/.test(val)) strength++;
        if (/[a-z]/.test(val)) strength++;
        if (/\d/.test(val)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(val)) strength++;
        if (val.length >= 8) strength++;

        if (val.length === 0) {
            e.target.style.border = "";
        } else if (strength <= 2) {
            e.target.style.border = "2px solid #ff0000";
        } else if (strength === 3 || strength === 4) {
            e.target.style.border = "2px solid #ff8c00";
        } else if (strength === 5) {
            e.target.style.border = "2px solid #07c937";
        }
    };

    const updateProfile = async (data) => {
        if (!ensureAuth()) return;
        try {

            const payload = { ...data };
            if (!payload.password) {
                delete payload.password;
            }
            else {

                const response = await api.post(
                    "/userr/profile/change-password/",
                    payload.password,
                );
                console.log(response, "response change password");
            }

            const formData = new FormData();
            formData.append("firstname", data.firstname || "");
            formData.append("lastname", data.lastname || "");
            formData.append("email", data.email || "");
            formData.append("bio", data.bio || "");
            if (imageFile) {
                formData.append("image", imageFile);
            }

            const response = await api.put(
                "/userr/profile/update/",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            const updated = { ...response.data, image: response.data.image || profileImg };
            setUser(updated);
            localStorage.setItem("userFirstName", updated.firstname);
            localStorage.setItem("userLastName", updated.lastname);
            localStorage.setItem("userEmail", updated.email);


            navigate('/user/profile', { state: { message: language === "ar" ? "تم تحديث الملف الشخصي بنجاح" : "Profile updated successfully", type: "success" } });
        } catch (err) {
            console.error("Error updating profile:", err);
            if (err.response && err.response.data) {
                const serverErrors = err.response.data;
                Object.keys(serverErrors).forEach((field) => {
                    setError(field, {
                        type: "server",
                        message: serverErrors[field][0]
                    });
                });
            } else {
                navigate('/user/profile', { state: { message: language === "ar" ? "فشل تحديث الملف الشخصي. يرجى المحاولة مرة أخرى" : "Failed to update profile. Please try again.", type: "error" } });
            }
        }
    };

    if (!user || !t) return <div className="text-center p-5">Loading...</div>;

    return (
        <div className={language === 'ar' ? style.fullAr : style.fullEn}>
            <div className={style.bgGrid} />

            <div className={style.profile}>
                <div className={style.center}>
                    <img
                        src={image || profileImg}
                        alt="Profile"
                        className={`${style.imgProfile} rounded-circle`}
                        onClick={handleImageClick}
                        style={{ cursor: "pointer" }}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleImageChange}
                    />
                    <p className={style.text}>{t('description')}</p>
                </div>

                <form onSubmit={handleSubmit(updateProfile)}>
                    <div className='row'>
                        <div className='form-group col-md-6 mb-3'>
                            <label className={style.text}><b>{t('firstNameLabel')}</b></label>
                            <Input
                                type="text"
                                name='firstname'
                                register={register}
                            />
                            {errors.firstname && <InputError error={errors.firstname} />}
                        </div>
                        <div className='form-group col-md-6 mb-3'>
                            <label className={style.text}><b>{t('lastNameLabel')}</b></label>
                            <Input
                                type="text"
                                name='lastname'
                                register={register}
                            />
                            {errors.lastname && <InputError error={errors.lastname} />}
                        </div>
                    </div>

                    <div className='form-group mb-3'>
                        <label className={style.text}><b>{t('emailLabel')}</b></label>
                        <Input
                            type="email"
                            name='email'
                            register={register}
                        />
                        {errors.email && <InputError error={errors.email} />}
                    </div>

                    <div className='form-group mb-3'>
                        <label className={style.text}><b>{t('fieldLabel')}</b></label>
                        <input
                            type="text"
                            className='form-control bg-light'
                            value={profileField || "Not selected yet"}
                            disabled
                            readOnly
                        />
                        <small className="text-muted">
                            {t('fieldManagedByCv', 'This field is updated when you upload a CV and choose a target field.')}
                        </small>
                    </div>

                    <div className='form-group mb-3'>
                        <label className={style.text}><b>{t('bio', 'Bio')}</b></label>
                        <textarea
                            {...register('bio')}
                            className='form-control'
                            maxLength={500}
                            rows={4}
                            placeholder={t('bioPlaceholder', 'Tell us a little about yourself')}
                        />
                        {errors.bio && <InputError error={errors.bio} />}
                    </div>

                    <div className='form-group mb-3'>
                        <label className={style.text}><b>{t('passwordLabel')}</b></label>
                        <Input
                            type="password"
                            name='password'
                            placeholder={t('passwordPlaceholder')}
                            register={register}
                            onChange={handlePasswordStrength}
                        />
                        {errors.password && <InputError error={errors.password} />}
                    </div>

                    <div className="d-flex gap-2 mt-4 p-2">
                        <button type="submit" className="alert alert-danger w-50">
                            <b>{t('save')}</b>
                        </button>
                        <button type='button' className="alert alert-success w-50" onClick={() => navigate(-1)}>
                            <b>{t('cancel')}</b>
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
